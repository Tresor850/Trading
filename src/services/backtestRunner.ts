import { Candle, PortfolioRiskConfig } from '../types/trading';
import { BacktestResultEx, runStrategyBacktest } from './backtestEngine';

export const BT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'LINK', 'NEAR', 'SUI', 'DOGE'];
let lastResult: BacktestResultEx | null = null;
export const getLastBacktest = () => lastResult;

async function klines(base: string, hours: number): Promise<Candle[]> {
  let end = Date.now();
  let all: Candle[] = [];
  while (all.length < hours) {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${base}USDT&interval=1h&limit=1000&endTime=${end}`);
    if (!r.ok) throw new Error(`Binance ${base}: HTTP ${r.status}`);
    const rows: any[][] = await r.json();
    if (!rows.length) break;
    const part = rows.map((k) => ({ timestamp: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
    all = [...part, ...all];
    end = part[0].timestamp - 1;
  }
  return all.slice(-hours);
}

/** Télécharge l'historique public Binance (aucune clé requise) et lance le vrai backtest. Lève une erreur si les données manquent. */
export async function runRealBacktest(risk: PortfolioRiskConfig, capital: number, days: number): Promise<BacktestResultEx> {
  const data: Record<string, Candle[]> = {};
  await Promise.all(BT_SYMBOLS.map(async (b) => { data[`${b}/USDT`] = await klines(b, days * 24); }));
  const n = Math.min(...Object.values(data).map((c) => c.length));
  const main = runStrategyBacktest(data, risk, capital, 'binance');
  const base = runStrategyBacktest(data, risk, capital, 'binance', { trend: false, crossExit: true });
  const oos = runStrategyBacktest(data, risk, capital, 'binance', { start: Math.floor((n * 2) / 3) });
  main.baseline = { netProfitPct: base.netProfitPct, winRatePct: base.winRatePct, profitFactor: base.profitFactor };
  main.outOfSample = { netProfitPct: oos.netProfitPct, winRatePct: oos.winRatePct, totalTrades: oos.totalTrades, profitFactor: oos.profitFactor };
  lastResult = main;
  return main;
}
