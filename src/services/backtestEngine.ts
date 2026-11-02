import { PortfolioRiskConfig, UniverseConfig, BacktestResult, Trade, Candle } from '../types/trading';
import { calculateSpotPositionSizing, evaluateCorrelationFilter } from './positionSizingEngine';

/**
 * Vrai backtest : rejoue la stratégie EMA 9/21 + RSI 14 sur des bougies 1h,
 * avec SL/TP réels (high/low), frais 0,1 %/côté, slippage 0,05 % et coupe-circuit journalier.
 * Aucune probabilité de gain n'est codée en dur : le taux de réussite est un RÉSULTAT.
 */
export type BacktestResultEx = BacktestResult & {
  dataSource: 'binance' | 'synthetic';
  tradesPerMonth: number;
  /** Rendement net de chaque trade, en fraction du capital au moment de l'entrée */
  tradeReturns: number[];
  /** Mêmes données, stratégie d'origine sans filtre de tendance (comparaison) */
  baseline?: { netProfitPct: number; winRatePct: number; profitFactor: number };
  /** Dernier tiers de la période, jamais utilisé pour choisir les réglages */
  outOfSample?: { netProfitPct: number; winRatePct: number; totalTrades: number; profitFactor: number };
};

/** Signal d'achat partagé par le backtest et le moteur live : croisement EMA9>EMA21, RSI<70, + filtre de tendance optionnel */
export function isBuySignal(e9: number[], e21: number[], e200: number[], r: number[], c: Candle[], i: number, trend: boolean, marketOk: boolean): boolean {
  if (!(e9[i] > e21[i] && e9[i - 1] <= e21[i - 1] && r[i] < 70)) return false;
  if (!trend) return true;
  return marketOk && c[i].close > e200[i] && e21[i] > e21[i - 3] && r[i] >= 45;
}

const FEE = 0.001;
const SLIP = 0.0005;
const DAY = 86400000;

export function emaSeries(c: Candle[], p: number): number[] {
  const k = 2 / (p + 1);
  const out: number[] = [];
  c.forEach((x, i) => out.push(i === 0 ? x.close : x.close * k + out[i - 1] * (1 - k)));
  return out;
}

export function rsiSeries(c: Candle[], p = 14): number[] {
  const out = new Array(c.length).fill(50);
  let g = 0, l = 0;
  for (let i = 1; i < c.length; i++) {
    const d = c[i].close - c[i - 1].close;
    const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= p) { g += up / p; l += dn / p; } else { g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p; }
    if (i >= p) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

interface Open { symbol: string; entry: number; qty: number; cost: number; sl: number; tp: number; t: number; fees: number; cash0: number }

export function runStrategyBacktest(
  data: Record<string, Candle[]>,
  risk: PortfolioRiskConfig,
  capital = 10000,
  source: 'binance' | 'synthetic' = 'binance',
  opts: { trend?: boolean; start?: number; crossExit?: boolean } = {}
): BacktestResultEx {
  const trend = opts.trend ?? risk.trendFilterEnabled !== false;
  const symbols = Object.keys(data);
  const n = Math.min(...symbols.map((s) => data[s].length));
  const cs: Record<string, Candle[]> = {};
  symbols.forEach((s) => (cs[s] = data[s].slice(-n)));
  const ema200 = {} as Record<string, number[]>, ema9 = {} as Record<string, number[]>, ema21 = {} as Record<string, number[]>, rsi = {} as Record<string, number[]>;
  symbols.forEach((s) => { ema9[s] = emaSeries(cs[s], 9); ema21[s] = emaSeries(cs[s], 21); ema200[s] = emaSeries(cs[s], 200); rsi[s] = rsiSeries(cs[s]); });

  let cash = capital, peak = capital, maxDdPct = 0, maxDdUsd = 0, fees = 0, cbCount = 0;
  let open: Open[] = [];
  let pending: string[] = [];
  const trades: Trade[] = [];
  const rets: number[] = [];
  const curve: BacktestResult['equityCurve'] = [];
  let dayKey = -1, dayStart = capital, halted = false;
  const mark = (i: number) => cash + open.reduce((s, p) => s + p.qty * cs[p.symbol][i].close, 0);

  const close = (p: Open, px: number, i: number, reason: Trade['exitReason'], equityBefore: number) => {
    const exitFee = p.qty * px * FEE;
    const pnl = p.qty * (px - p.entry) - p.fees - exitFee;
    cash += p.qty * px - exitFee;
    fees += p.fees + exitFee;
    rets.push(pnl / p.cash0);
    trades.push({
      id: `bt_${trades.length + 1}`, symbol: p.symbol, side: 'BUY', mode: 'simulation',
      entryPrice: p.entry, exitPrice: px, quantity: p.qty, entryTime: p.t, exitTime: cs[p.symbol][i].timestamp,
      pnlUsd: Number(pnl.toFixed(2)), pnlPct: Number(((pnl / p.cost) * 100).toFixed(2)), feesUsd: Number((p.fees + exitFee).toFixed(2)),
      exitReason: reason, durationMinutes: Math.round((cs[p.symbol][i].timestamp - p.t) / 60000),
    });
  };

  const first = Math.max(22, trend ? 200 : 22, opts.start ?? 0);
  const btc = symbols.includes('BTC/USDT') ? 'BTC/USDT' : symbols[0];
  for (let i = first; i < n; i++) {
    const ts = cs[symbols[0]][i].timestamp;
    const dk = Math.floor(ts / DAY);
    if (dk !== dayKey) { dayKey = dk; dayStart = mark(i - 1); halted = false; }

    // 1. entrées planifiées (signal à la clôture précédente, exécution à l'ouverture)
    if (!halted) {
      for (const s of pending) {
        if (open.length >= risk.maxSimultaneousPositions || open.some((p) => p.symbol === s)) continue;
        if (risk.correlationFilterEnabled && !evaluateCorrelationFilter(s, 'crypto', open.map((p) => p.symbol)).allowed) continue;
        const px = cs[s][i].open * (1 + SLIP);
        const eq = mark(i - 1);
        const sz = calculateSpotPositionSizing({
          totalEquity: eq, availableCash: cash, riskPercentage: risk.riskPerTradePct, entryPrice: px,
          stopLossPrice: px * (1 - risk.stopLossPct / 100), targetRiskRewardRatio: risk.minRiskRewardRatio || risk.takeProfitRatio,
          maxAllocationPct: risk.maxAllocationPerPositionPct, minNotionalUsd: risk.minNotionalUsd,
        });
        if (!sz.isAccepted) continue;
        const cost = sz.positionSizeUsd, f = cost * FEE;
        cash -= cost + f;
        open.push({ symbol: s, entry: px, qty: cost / px, cost, sl: px * (1 - risk.stopLossPct / 100), tp: sz.takeProfitPrice, t: cs[s][i].timestamp, fees: f, cash0: eq });
      }
    }
    pending = [];

    // 2. sorties : SL prioritaire si SL et TP touchés dans la même bougie (hypothèse prudente)
    for (const p of [...open]) {
      const c = cs[p.symbol][i];
      let done = true;
      if (c.low <= p.sl) close(p, p.sl * (1 - SLIP), i, 'STOP_LOSS', 0);
      else if (c.high >= p.tp) close(p, p.tp, i, 'TAKE_PROFIT', 0);
      else if (opts.crossExit && ema9[p.symbol][i] < ema21[p.symbol][i] && ema9[p.symbol][i - 1] >= ema21[p.symbol][i - 1]) close(p, c.close, i, 'MANUAL', 0);
      else done = false;
      if (done) open = open.filter((x) => x !== p);
    }

    // 3. coupe-circuit journalier (clôture de protection)
    const eq = mark(i);
    if (!halted && (dayStart - eq) / dayStart * 100 >= risk.dailyLossCircuitBreakerPct) {
      halted = true; cbCount++;
      open.forEach((p) => close(p, cs[p.symbol][i].close, i, 'EMERGENCY_STOP', 0));
      open = [];
    }

    // 4. signaux à la clôture
    if (!halted) {
      for (const s of symbols) {
        if (isBuySignal(ema9[s], ema21[s], ema200[s], rsi[s], cs[s], i, trend, cs[btc][i].close > ema200[btc][i])) pending.push(s);
      }
    }

    const e = mark(i);
    peak = Math.max(peak, e);
    const dd = ((peak - e) / peak) * 100;
    if (dd > maxDdPct) { maxDdPct = dd; maxDdUsd = peak - e; }
    if (i % 24 === 0) curve.push({ timestamp: ts, dateStr: new Date(ts).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }), equity: Number(e.toFixed(2)), drawdownPct: Number(dd.toFixed(2)) });
  }

  const last = mark(n - 1);
  const wins = trades.filter((t) => t.pnlUsd > 0), losses = trades.filter((t) => t.pnlUsd <= 0);
  const gp = wins.reduce((s, t) => s + t.pnlUsd, 0), gl = Math.abs(losses.reduce((s, t) => s + t.pnlUsd, 0));
  const dr = curve.map((p, k) => (k ? (p.equity - curve[k - 1].equity) / curve[k - 1].equity : 0));
  const mu = dr.reduce((a, b) => a + b, 0) / (dr.length || 1);
  const sd = Math.sqrt(dr.reduce((a, b) => a + (b - mu) ** 2, 0) / (dr.length || 1));
  const days = Math.max(1, (n - first) / 24);
  const pairBreakdown = symbols.map((s) => {
    const t = trades.filter((x) => x.symbol === s), w = t.filter((x) => x.pnlUsd > 0);
    const g = w.reduce((a, x) => a + x.pnlUsd, 0), l = Math.abs(t.filter((x) => x.pnlUsd <= 0).reduce((a, x) => a + x.pnlUsd, 0));
    return { symbol: s, tradesCount: t.length, winRate: t.length ? Number(((w.length / t.length) * 100).toFixed(1)) : 0, pnlUsd: Number(t.reduce((a, x) => a + x.pnlUsd, 0).toFixed(2)), profitFactor: l > 0 ? Number((g / l).toFixed(2)) : 0 };
  }).sort((a, b) => b.pnlUsd - a.pnlUsd);

  return {
    startDate: new Date(cs[symbols[0]][first].timestamp).toLocaleDateString('fr-FR'), endDate: new Date(cs[symbols[0]][n - 1].timestamp).toLocaleDateString('fr-FR'),
    initialBalance: capital, finalBalance: Number(last.toFixed(2)), netProfitUsd: Number((last - capital).toFixed(2)), netProfitPct: Number((((last - capital) / capital) * 100).toFixed(2)),
    totalTrades: trades.length, winningTrades: wins.length, losingTrades: losses.length, winRatePct: trades.length ? Number(((wins.length / trades.length) * 100).toFixed(1)) : 0,
    profitFactor: gl > 0 ? Number((gp / gl).toFixed(2)) : 0, maxDrawdownPct: Number(maxDdPct.toFixed(2)), maxDrawdownUsd: Number(maxDdUsd.toFixed(2)),
    sharpeRatio: sd > 0 ? Number(((mu / sd) * Math.sqrt(365)).toFixed(2)) : 0,
    averageTradeDurationHours: trades.length ? Number((trades.reduce((a, t) => a + t.durationMinutes, 0) / trades.length / 60).toFixed(1)) : 0,
    totalFeesPaidUsd: Number(fees.toFixed(2)), circuitBreakerTriggers: cbCount, equityCurve: curve, trades, pairBreakdown,
    dataSource: source, tradesPerMonth: Number(((trades.length / days) * 30).toFixed(1)), tradeReturns: rets,
  };
}

/** Données de contrôle (marche aléatoire sans tendance) : sert uniquement de test à vide, jamais de prévision. */
export function syntheticCandles(count = 1500, vol = 0.008, seed = 1): Candle[] {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const out: Candle[] = [];
  let px = 100;
  const t0 = Math.floor(Date.now() / 3600000) * 3600000 - count * 3600000;
  for (let i = 0; i < count; i++) {
    const o = px, c = o * (1 + (rnd() - 0.5) * 2 * vol);
    out.push({ timestamp: t0 + i * 3600000, open: o, close: c, high: Math.max(o, c) * (1 + rnd() * vol * 0.4), low: Math.min(o, c) * (1 - rnd() * vol * 0.4), volume: 1 });
    px = c;
  }
  return out;
}

export function runPortfolioBacktest(risk: PortfolioRiskConfig, _u: UniverseConfig, capital = 10000, daysBack = 60): BacktestResultEx {
  const data: Record<string, Candle[]> = {};
  ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'LINK', 'NEAR', 'SUI', 'DOGE'].forEach((b, k) => (data[`${b}/USDT`] = syntheticCandles(Math.max(120, daysBack * 24), 0.008, k + 7)));
  return runStrategyBacktest(data, risk, capital, 'synthetic');
}
