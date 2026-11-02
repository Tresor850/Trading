import { Candle, MarketPair } from '../types/trading';
import { emaSeries, rsiSeries, isBuySignal } from './backtestEngine';

const API = 'https://api.binance.com/api/v3';
const LEVERAGED = /(UP|DOWN|BULL|BEAR)USDT$/;
const STABLE = /^(USDC|FDUSD|TUSD|DAI|USDP|EUR|AEUR|USD1)USDT$/;

/** Marchés réels : tickers 24h publics Binance Spot (USDT), bougies 1h réelles, indicateurs et signaux calculés. Aucune donnée simulée. */
export async function fetchRealMarkets(trend = true, maxPairs = 40, minVolumeUsd = 5_000_000): Promise<MarketPair[]> {
  const r = await fetch(`${API}/ticker/24hr`);
  if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
  const all: any[] = await r.json();
  const top = all
    .filter((t) => t.symbol.endsWith('USDT') && !LEVERAGED.test(t.symbol) && !STABLE.test(t.symbol) && +t.quoteVolume >= minVolumeUsd && +t.lastPrice > 0)
    .sort((a, b) => +b.quoteVolume - +a.quoteVolume)
    .slice(0, maxPairs);

  const kl = async (sym: string): Promise<Candle[]> => {
    const res = await fetch(`${API}/klines?symbol=${sym}&interval=1h&limit=260`);
    const rows: any[][] = await res.json();
    return rows.slice(0, -1).map((k) => ({ timestamp: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] })); // bougie en cours exclue
  };
  const candles = await Promise.all(top.map((t) => kl(t.symbol).catch(() => [] as Candle[])));
  const btcIdx = top.findIndex((t) => t.symbol === 'BTCUSDT');
  const btcE200 = btcIdx >= 0 && candles[btcIdx].length ? emaSeries(candles[btcIdx], 200) : [];
  const btcOk = btcE200.length ? candles[btcIdx][candles[btcIdx].length - 1].close > btcE200[btcE200.length - 1] : false;

  return top.map((t, k) => {
    const c = candles[k], base = t.symbol.replace(/USDT$/, '');
    const price = +t.lastPrice, bid = +t.bidPrice, ask = +t.askPrice;
    let e9 = price, e21 = price, rs = 50, atr = 0, sig: MarketPair['activeSignal'] = 'NONE';
    if (c.length > 210) {
      const E9 = emaSeries(c, 9), E21 = emaSeries(c, 21), E200 = emaSeries(c, 200), R = rsiSeries(c), i = c.length - 1;
      e9 = E9[i]; e21 = E21[i]; rs = R[i];
      atr = c.slice(-14).reduce((s, x, j, a) => s + Math.max(x.high - x.low, j ? Math.abs(x.high - a[j - 1].close) : 0), 0) / 14;
      sig = rs >= 70 ? 'OVERBOUGHT' : isBuySignal(E9, E21, E200, R, c, i, trend, btcOk) ? 'BUY_SIGNAL' : 'NONE';
    }
    return {
      symbol: `${base}/USDT`, name: base, assetCategory: 'crypto', baseAsset: base, quoteAsset: 'USDT',
      price, change24h: +t.priceChangePercent, volume24h: +t.quoteVolume, spreadPct: bid > 0 && ask > 0 ? ((ask - bid) / price) * 100 : 0,
      ema9: e9, ema21: e21, rsi14: rs, atr14: atr, isLeveraged: false, isStable: false, isMonitoring: false, isEligible: true, isEnabled: true,
      activeSignal: sig, consecutiveLosses: 0, cooldownUntilTimestamp: null, candles: c,
    } as MarketPair;
  });
}

/** Mise à jour légère des prix (une seule requête) entre deux rafraîchissements complets. */
export async function fetchPrices(): Promise<Record<string, number>> {
  const r = await fetch(`${API}/ticker/price`);
  if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
  const out: Record<string, number> = {};
  (await r.json()).forEach((t: any) => { if (t.symbol.endsWith('USDT')) out[t.symbol.replace(/USDT$/, '/USDT')] = +t.price; });
  return out;
}
