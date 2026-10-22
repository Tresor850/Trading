import { MarketPair, Candle, AssetCategory } from '../types/trading';

// Helper to generate realistic candles for a given base price and trend
export function generateCandles(basePrice: number, count: number = 50, volatility: number = 0.015): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice * (1 - volatility * (count / 2));
  const now = Date.now();
  const hourMs = 3600 * 1000;

  for (let i = count; i >= 0; i--) {
    const time = now - i * hourMs;
    const deltaPct = (Math.random() - 0.48) * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + deltaPct);
    const high = Math.max(open, close) * (1 + Math.random() * (volatility * 0.7));
    const low = Math.min(open, close) * (1 - Math.random() * (volatility * 0.7));
    const volume = Math.floor((Math.random() * 50000 + 10000) * (basePrice > 100 ? 10 : 500));

    candles.push({
      timestamp: time,
      open: Number(open.toFixed(basePrice < 1 ? 5 : 2)),
      high: Number(high.toFixed(basePrice < 1 ? 5 : 2)),
      low: Number(low.toFixed(basePrice < 1 ? 5 : 2)),
      close: Number(close.toFixed(basePrice < 1 ? 5 : 2)),
      volume,
    });
    currentPrice = close;
  }
  return candles;
}

// Compute Exponential Moving Average
export function calculateEMA(candles: Candle[], period: number): number {
  if (candles.length === 0) return 0;
  if (candles.length < period) return candles[candles.length - 1].close;

  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return Number(ema.toFixed(candles[0].close < 1 ? 5 : 2));
}

// Compute Relative Strength Index (RSI 14)
export function calculateRSI(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Number(rsi.toFixed(1));
}

// Compute Average True Range (ATR 14)
export function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return candles[0] ? candles[0].close * 0.02 : 1;

  let trSum = 0;
  for (let i = 1; i <= Math.min(period, candles.length - 1); i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trSum += tr;
  }
  return Number((trSum / Math.min(period, candles.length - 1)).toFixed(candles[0].close < 1 ? 5 : 2));
}

// Initial universe of raw Binance pairs and traditional multi-market assets
interface RawMarketSeed {
  symbol: string;
  name?: string;
  assetCategory?: AssetCategory;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number; // in USDT or base quote
  spreadPct: number;
  isLeveraged?: boolean;
  isStable?: boolean;
  isMonitoring?: boolean;
  minHistoryDays?: number;
}

const RAW_SEEDS: RawMarketSeed[] = [
  // --- INDICES MAJEURS (CAC 40, DAX 40, S&P 500, NASDAQ) ---
  { symbol: 'CAC40/EUR', name: 'Indice CAC 40 Paris', assetCategory: 'index', baseAsset: 'CAC40', quoteAsset: 'EUR', price: 7548.60, change24h: 0.58, volume24h: 2450000000, spreadPct: 0.015 },
  { symbol: 'DAX40/EUR', name: 'Indice DAX 40 Francfort', assetCategory: 'index', baseAsset: 'DAX40', quoteAsset: 'EUR', price: 19485.20, change24h: 0.72, volume24h: 3890000000, spreadPct: 0.015 },
  { symbol: 'SPX/USD', name: 'S&P 500 Wall Street', assetCategory: 'index', baseAsset: 'SPX', quoteAsset: 'USD', price: 5868.40, change24h: 0.42, volume24h: 18200000000, spreadPct: 0.01 },
  { symbol: 'NDX/USD', name: 'NASDAQ 100 Tech', assetCategory: 'index', baseAsset: 'NDX', quoteAsset: 'USD', price: 20395.10, change24h: 0.88, volume24h: 14500000000, spreadPct: 0.012 },

  // --- MATIÈRES PREMIÈRES (OR / GOLD, PÉTROLE, ARGENT) ---
  { symbol: 'XAU/USD', name: 'Or / Gold Spot (Once)', assetCategory: 'commodity', baseAsset: 'XAU', quoteAsset: 'USD', price: 2724.80, change24h: 1.15, volume24h: 8400000000, spreadPct: 0.02 },
  { symbol: 'WTI/USD', name: 'Pétrole Brut WTI (Baril)', assetCategory: 'commodity', baseAsset: 'WTI', quoteAsset: 'USD', price: 71.95, change24h: -0.65, volume24h: 5200000000, spreadPct: 0.025 },
  { symbol: 'XAG/USD', name: 'Argent / Silver Spot', assetCategory: 'commodity', baseAsset: 'XAG', quoteAsset: 'USD', price: 32.55, change24h: 1.45, volume24h: 2100000000, spreadPct: 0.03 },

  // --- FOREX MAJEUR ---
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', assetCategory: 'forex', baseAsset: 'EUR', quoteAsset: 'USD', price: 1.0838, change24h: -0.12, volume24h: 42000000000, spreadPct: 0.008 },
  { symbol: 'USD/EUR', name: 'US Dollar / Euro', assetCategory: 'forex', baseAsset: 'USD', quoteAsset: 'EUR', price: 0.9227, change24h: 0.12, volume24h: 41500000000, spreadPct: 0.008 },
  { symbol: 'GBP/USD', name: 'Livre Sterling / USD', assetCategory: 'forex', baseAsset: 'GBP', quoteAsset: 'USD', price: 1.2985, change24h: 0.15, volume24h: 26000000000, spreadPct: 0.01 },

  // --- ACTIONS DU CAC 40 & INTERNATIONALES ---
  { symbol: 'MC/EUR', name: 'LVMH Moët Hennessy', assetCategory: 'stock', baseAsset: 'MC', quoteAsset: 'EUR', price: 628.40, change24h: 1.35, volume24h: 480000000, spreadPct: 0.03 },
  { symbol: 'TTE/EUR', name: 'TotalEnergies SE', assetCategory: 'stock', baseAsset: 'TTE', quoteAsset: 'EUR', price: 61.20, change24h: -0.30, volume24h: 390000000, spreadPct: 0.03 },
  { symbol: 'SAN/EUR', name: 'Sanofi SA', assetCategory: 'stock', baseAsset: 'SAN', quoteAsset: 'EUR', price: 101.50, change24h: 0.45, volume24h: 260000000, spreadPct: 0.035 },
  { symbol: 'AIR/EUR', name: 'Airbus SE', assetCategory: 'stock', baseAsset: 'AIR', quoteAsset: 'EUR', price: 139.10, change24h: 0.95, volume24h: 290000000, spreadPct: 0.035 },
  { symbol: 'AAPL/USD', name: 'Apple Inc.', assetCategory: 'stock', baseAsset: 'AAPL', quoteAsset: 'USD', price: 233.10, change24h: 1.05, volume24h: 9200000000, spreadPct: 0.015 },
  { symbol: 'TSLA/USD', name: 'Tesla Inc.', assetCategory: 'stock', baseAsset: 'TSLA', quoteAsset: 'USD', price: 219.50, change24h: -1.75, volume24h: 11500000000, spreadPct: 0.02 },

  // --- CRYPTO SPOT (BINANCE) ---
  { symbol: 'BTC/USDT', name: 'Bitcoin Spot', assetCategory: 'crypto', baseAsset: 'BTC', quoteAsset: 'USDT', price: 91420.50, change24h: 2.85, volume24h: 1845000000, spreadPct: 0.01 },
  { symbol: 'ETH/USDT', name: 'Ethereum Spot', assetCategory: 'crypto', baseAsset: 'ETH', quoteAsset: 'USDT', price: 3410.20, change24h: 3.42, volume24h: 920000000, spreadPct: 0.015 },
  { symbol: 'SOL/USDT', name: 'Solana Spot', assetCategory: 'crypto', baseAsset: 'SOL', quoteAsset: 'USDT', price: 186.40, change24h: 5.12, volume24h: 640000000, spreadPct: 0.02 },
  { symbol: 'BNB/USDT', name: 'Binance Coin', assetCategory: 'crypto', baseAsset: 'BNB', quoteAsset: 'USDT', price: 638.10, change24h: 1.15, volume24h: 280000000, spreadPct: 0.02 },
  { symbol: 'XRP/USDT', name: 'Ripple Spot', assetCategory: 'crypto', baseAsset: 'XRP', quoteAsset: 'USDT', price: 0.8420, change24h: 4.80, volume24h: 310000000, spreadPct: 0.03 },
  { symbol: 'AVAX/USDT', name: 'Avalanche', assetCategory: 'crypto', baseAsset: 'AVAX', quoteAsset: 'USDT', price: 38.60, change24h: -1.20, volume24h: 145000000, spreadPct: 0.035 },
  { symbol: 'LINK/USDT', name: 'Chainlink', assetCategory: 'crypto', baseAsset: 'LINK', quoteAsset: 'USDT', price: 17.85, change24h: 3.90, volume24h: 115000000, spreadPct: 0.03 },
  { symbol: 'NEAR/USDT', name: 'NEAR Protocol', assetCategory: 'crypto', baseAsset: 'NEAR', quoteAsset: 'USDT', price: 6.45, change24h: 6.25, volume24h: 98000000, spreadPct: 0.04 },
  { symbol: 'SUI/USDT', name: 'Sui Network', assetCategory: 'crypto', baseAsset: 'SUI', quoteAsset: 'USDT', price: 3.12, change24h: 7.40, volume24h: 210000000, spreadPct: 0.03 },
  { symbol: 'DOGE/USDT', name: 'Dogecoin Spot', assetCategory: 'crypto', baseAsset: 'DOGE', quoteAsset: 'USDT', price: 0.2450, change24h: 2.10, volume24h: 290000000, spreadPct: 0.025 },
  { symbol: 'ADA/USDT', name: 'Cardano Spot', assetCategory: 'crypto', baseAsset: 'ADA', quoteAsset: 'USDT', price: 0.6840, change24h: 1.85, volume24h: 89000000, spreadPct: 0.04 },
  { symbol: 'DOT/USDT', name: 'Polkadot Spot', assetCategory: 'crypto', baseAsset: 'DOT', quoteAsset: 'USDT', price: 8.75, change24h: -0.65, volume24h: 67000000, spreadPct: 0.04 },
  { symbol: 'RENDER/USDT', name: 'Render Token', assetCategory: 'crypto', baseAsset: 'RENDER', quoteAsset: 'USDT', price: 9.35, change24h: 4.10, volume24h: 74000000, spreadPct: 0.045 },
  { symbol: 'PEPE/USDT', name: 'Pepe Meme Spot', assetCategory: 'crypto', baseAsset: 'PEPE', quoteAsset: 'USDT', price: 0.0000142, change24h: 8.90, volume24h: 195000000, spreadPct: 0.05 },
  { symbol: 'TAO/USDT', name: 'Bittensor TAO', assetCategory: 'crypto', baseAsset: 'TAO', quoteAsset: 'USDT', price: 542.00, change24h: 5.60, volume24h: 88000000, spreadPct: 0.04 },
  { symbol: 'INJ/USDT', name: 'Injective Protocol', assetCategory: 'crypto', baseAsset: 'INJ', quoteAsset: 'USDT', price: 29.40, change24h: 3.15, volume24h: 52000000, spreadPct: 0.04 },
  { symbol: 'FET/USDT', name: 'Artificial Superintelligence', assetCategory: 'crypto', baseAsset: 'FET', quoteAsset: 'USDT', price: 1.72, change24h: 4.45, volume24h: 63000000, spreadPct: 0.045 },
  { symbol: 'AAVE/USDT', name: 'Aave Protocol', assetCategory: 'crypto', baseAsset: 'AAVE', quoteAsset: 'USDT', price: 194.50, change24h: 2.30, volume24h: 48000000, spreadPct: 0.035 },
  { symbol: 'APT/USDT', name: 'Aptos Spot', assetCategory: 'crypto', baseAsset: 'APT', quoteAsset: 'USDT', price: 11.80, change24h: 1.40, volume24h: 59000000, spreadPct: 0.04 },
  { symbol: 'POL/USDT', name: 'Polygon Ecosystem', assetCategory: 'crypto', baseAsset: 'POL', quoteAsset: 'USDT', price: 0.4850, change24h: 0.95, volume24h: 41000000, spreadPct: 0.045 },
  { symbol: 'ARB/USDT', name: 'Arbitrum One', assetCategory: 'crypto', baseAsset: 'ARB', quoteAsset: 'USDT', price: 0.7250, change24h: -1.80, volume24h: 46000000, spreadPct: 0.04 },
  { symbol: 'OP/USDT', name: 'Optimism', assetCategory: 'crypto', baseAsset: 'OP', quoteAsset: 'USDT', price: 1.88, change24h: 1.25, volume24h: 38000000, spreadPct: 0.045 },
  { symbol: 'TIA/USDT', name: 'Celestia', assetCategory: 'crypto', baseAsset: 'TIA', quoteAsset: 'USDT', price: 5.95, change24h: -2.40, volume24h: 34000000, spreadPct: 0.05 },
  { symbol: 'KAS/USDT', name: 'Kaspa Spot', assetCategory: 'crypto', baseAsset: 'KAS', quoteAsset: 'USDT', price: 0.1620, change24h: 3.10, volume24h: 42000000, spreadPct: 0.04 },
  { symbol: 'SEI/USDT', name: 'Sei Network', assetCategory: 'crypto', baseAsset: 'SEI', quoteAsset: 'USDT', price: 0.5120, change24h: 2.80, volume24h: 31000000, spreadPct: 0.045 },
  { symbol: 'ATOM/USDT', name: 'Cosmos Hub', assetCategory: 'crypto', baseAsset: 'ATOM', quoteAsset: 'USDT', price: 5.40, change24h: -0.30, volume24h: 29000000, spreadPct: 0.04 },
  { symbol: 'UNI/USDT', name: 'Uniswap Spot', assetCategory: 'crypto', baseAsset: 'UNI', quoteAsset: 'USDT', price: 9.80, change24h: 1.90, volume24h: 37000000, spreadPct: 0.04 },
  { symbol: 'LTC/USDT', name: 'Litecoin Spot', assetCategory: 'crypto', baseAsset: 'LTC', quoteAsset: 'USDT', price: 82.40, change24h: 0.60, volume24h: 45000000, spreadPct: 0.035 },
  { symbol: 'FIL/USDT', name: 'Filecoin Spot', assetCategory: 'crypto', baseAsset: 'FIL', quoteAsset: 'USDT', price: 4.65, change24h: -1.10, volume24h: 24000000, spreadPct: 0.05 },
  { symbol: 'ICP/USDT', name: 'Internet Computer', assetCategory: 'crypto', baseAsset: 'ICP', quoteAsset: 'USDT', price: 10.25, change24h: 2.70, volume24h: 32000000, spreadPct: 0.045 },
  { symbol: 'HBAR/USDT', name: 'Hedera Hashgraph', assetCategory: 'crypto', baseAsset: 'HBAR', quoteAsset: 'USDT', price: 0.1180, change24h: 5.80, volume24h: 62000000, spreadPct: 0.04 },
  { symbol: 'ALGO/USDT', name: 'Algorand', assetCategory: 'crypto', baseAsset: 'ALGO', quoteAsset: 'USDT', price: 0.2240, change24h: 3.40, volume24h: 28000000, spreadPct: 0.045 },
  { symbol: 'STX/USDT', name: 'Stacks Bitcoin L2', assetCategory: 'crypto', baseAsset: 'STX', quoteAsset: 'USDT', price: 2.14, change24h: 1.95, volume24h: 26000000, spreadPct: 0.05 },
  { symbol: 'PENDLE/USDT', name: 'Pendle Finance', assetCategory: 'crypto', baseAsset: 'PENDLE', quoteAsset: 'USDT', price: 5.82, change24h: 4.10, volume24h: 33000000, spreadPct: 0.045 },
  { symbol: 'WLD/USDT', name: 'Worldcoin', assetCategory: 'crypto', baseAsset: 'WLD', quoteAsset: 'USDT', price: 2.45, change24h: -3.20, volume24h: 41000000, spreadPct: 0.04 },
  { symbol: 'FTM/USDT', name: 'Fantom / Sonic', assetCategory: 'crypto', baseAsset: 'FTM', quoteAsset: 'USDT', price: 0.8850, change24h: 6.90, volume24h: 54000000, spreadPct: 0.035 },
  { symbol: 'GALA/USDT', name: 'Gala Games', assetCategory: 'crypto', baseAsset: 'GALA', quoteAsset: 'USDT', price: 0.0345, change24h: 1.80, volume24h: 19000000, spreadPct: 0.05 },
  { symbol: 'JUP/USDT', name: 'Jupiter Solana DEX', assetCategory: 'crypto', baseAsset: 'JUP', quoteAsset: 'USDT', price: 1.15, change24h: 3.20, volume24h: 36000000, spreadPct: 0.045 },
  { symbol: 'PYTH/USDT', name: 'Pyth Network', assetCategory: 'crypto', baseAsset: 'PYTH', quoteAsset: 'USDT', price: 0.4420, change24h: 2.10, volume24h: 21000000, spreadPct: 0.05 },
  { symbol: 'ONDO/USDT', name: 'Ondo RWA Finance', assetCategory: 'crypto', baseAsset: 'ONDO', quoteAsset: 'USDT', price: 0.9850, change24h: 4.80, volume24h: 49000000, spreadPct: 0.04 },
  { symbol: 'FLOKI/USDT', name: 'Floki Inu', assetCategory: 'crypto', baseAsset: 'FLOKI', quoteAsset: 'USDT', price: 0.000195, change24h: 5.40, volume24h: 37000000, spreadPct: 0.055 },
  { symbol: 'BONK/USDT', name: 'Bonk Solana Meme', assetCategory: 'crypto', baseAsset: 'BONK', quoteAsset: 'USDT', price: 0.0000284, change24h: 4.20, volume24h: 48000000, spreadPct: 0.05 },
  { symbol: 'SHIB/USDT', name: 'Shiba Inu', assetCategory: 'crypto', baseAsset: 'SHIB', quoteAsset: 'USDT', price: 0.0000248, change24h: 1.45, volume24h: 82000000, spreadPct: 0.03 },

  // --- JETONS À EFFET DE LEVIER (À exclure automatiquement par filtre U2) ---
  { symbol: 'BTCUP/USDT', baseAsset: 'BTCUP', quoteAsset: 'USDT', price: 18.20, change24h: 8.5, volume24h: 4200000, spreadPct: 0.12, isLeveraged: true },
  { symbol: 'BTCDOWN/USDT', baseAsset: 'BTCDOWN', quoteAsset: 'USDT', price: 0.045, change24h: -9.1, volume24h: 2100000, spreadPct: 0.15, isLeveraged: true },
  { symbol: 'ETHBULL/USDT', baseAsset: 'ETHBULL', quoteAsset: 'USDT', price: 12.40, change24h: 9.8, volume24h: 1800000, spreadPct: 0.18, isLeveraged: true },
  { symbol: 'ETHBEAR/USDT', baseAsset: 'ETHBEAR', quoteAsset: 'USDT', price: 0.038, change24h: -10.2, volume24h: 1200000, spreadPct: 0.22, isLeveraged: true },

  // --- STABLECOINS (À exclure par filtre U2) ---
  { symbol: 'USDC/USDT', baseAsset: 'USDC', quoteAsset: 'USDT', price: 1.0001, change24h: 0.01, volume24h: 410000000, spreadPct: 0.005, isStable: true },
  { symbol: 'FDUSD/USDT', baseAsset: 'FDUSD', quoteAsset: 'USDT', price: 0.9998, change24h: -0.01, volume24h: 620000000, spreadPct: 0.005, isStable: true },
  { symbol: 'TUSD/USDT', baseAsset: 'TUSD', quoteAsset: 'USDT', price: 0.9995, change24h: 0.00, volume24h: 18000000, spreadPct: 0.01, isStable: true },

  // --- PAIRES ILLIQUIDES / HORS CRITÈRES ---
  { symbol: 'LOWVOL/USDT', baseAsset: 'LOWVOL', quoteAsset: 'USDT', price: 0.0820, change24h: -4.20, volume24h: 850000, spreadPct: 0.38, minHistoryDays: 12 },
  { symbol: 'WIDESPD/USDT', baseAsset: 'WIDESPD', quoteAsset: 'USDT', price: 1.45, change24h: 12.0, volume24h: 1200000, spreadPct: 0.42 },
  { symbol: 'VULNERABLE/USDT', baseAsset: 'VULNERABLE', quoteAsset: 'USDT', price: 0.12, change24h: -18.5, volume24h: 3100000, spreadPct: 0.25, isMonitoring: true }
];

export function buildInitialMarketPairs(): MarketPair[] {
  return RAW_SEEDS.map((seed) => {
    const candles = generateCandles(seed.price, 40, 0.018);
    // Align last candle close with seed price
    if (candles.length > 0) {
      candles[candles.length - 1].close = seed.price;
    }

    const ema9 = calculateEMA(candles, 9);
    const ema21 = calculateEMA(candles, 21);
    const rsi14 = calculateRSI(candles, 14);
    const atr14 = calculateATR(candles, 14);

    // Initial signal detection: EMA 9 > EMA 21 and RSI between 50 and 70 (classic trend filter)
    let activeSignal: 'NONE' | 'BUY_SIGNAL' | 'OVERBOUGHT' | 'COOLDOWN' = 'NONE';
    if (rsi14 > 72) {
      activeSignal = 'OVERBOUGHT';
    } else if (ema9 > ema21 && rsi14 >= 52 && rsi14 <= 70) {
      activeSignal = 'BUY_SIGNAL';
    }

    // Leveraged check
    const isLeveraged = Boolean(
      seed.isLeveraged ||
      seed.symbol.includes('UP/') ||
      seed.symbol.includes('DOWN/') ||
      seed.symbol.includes('BULL/') ||
      seed.symbol.includes('BEAR/')
    );

    // Stable/Stable check
    const isStable = Boolean(
      seed.isStable ||
      (seed.baseAsset === 'USDC' && seed.quoteAsset === 'USDT') ||
      (seed.baseAsset === 'FDUSD' && seed.quoteAsset === 'USDT') ||
      (seed.baseAsset === 'TUSD' && seed.quoteAsset === 'USDT') ||
      (seed.baseAsset === 'DAI' && seed.quoteAsset === 'USDT')
    );

    const isMonitoring = Boolean(seed.isMonitoring);

    return {
      symbol: seed.symbol,
      name: seed.name || seed.symbol,
      assetCategory: seed.assetCategory || 'crypto',
      baseAsset: seed.baseAsset,
      quoteAsset: seed.quoteAsset,
      price: seed.price,
      change24h: seed.change24h,
      volume24h: seed.volume24h,
      spreadPct: seed.spreadPct,
      ema9,
      ema21,
      rsi14,
      atr14,
      isLeveraged,
      isStable,
      isMonitoring,
      isEligible: true, // Will be dynamically evaluated by Universe filter
      isEnabled: true,
      activeSignal,
      consecutiveLosses: 0,
      cooldownUntilTimestamp: null,
      candles,
    };
  });
}
