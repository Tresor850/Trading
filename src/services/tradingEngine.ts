import {
  TradingMode,
  BotStatus,
  MarketPair,
  Position,
  Trade,
  PortfolioRiskConfig,
  UniverseConfig,
  ExchangeConfig,
  TelegramConfig,
  AuditLog,
  Candle,
} from '../types/trading';
import { calculateEMA, calculateRSI, calculateATR } from '../data/mockMarkets';

export interface EngineState {
  mode: TradingMode;
  status: BotStatus;
  balanceUsd: number;
  startOfDayEquity: number;
  circuitBreakerUntil: number | null;
  lastScanTimestamp: number;
  positions: Position[];
  trades: Trade[];
  logs: AuditLog[];
  dailyPnlUsd: number;
  dailyPnlPct: number;
}

export const DEFAULT_RISK_CONFIG: PortfolioRiskConfig = {
  riskPerTradePct: 2.0, // 2%
  stopLossPct: 1.5, // 1.5%
  takeProfitRatio: 2.0, // 1:2 -> TP = 3.0%
  maxSimultaneousPositions: 5,
  maxAllocationPerPositionPct: 20.0, // 20% max per position
  dailyLossCircuitBreakerPct: 5.0, // 5% max daily drawdown -> 24h pause
  circuitBreakerPauseHours: 24,
  maxEntriesPerCandle: 2,
  cooldownCandlesAfterExit: 3,
  maxConsecutiveLossesPerPair: 3,
  priorityRule: 'LIQUIDITY_DESC',
  stopLossMethod: 'FIXED_PCT',
  atrMultiplier: 1.5,
  minNotionalUsd: 10,
  timeframe: '1h',
};

export const DEFAULT_UNIVERSE_CONFIG: UniverseConfig = {
  filterMode: 'auto_filtered',
  quoteAsset: 'ALL', // Par défaut 'ALL' pour inclure CAC 40 (EUR), SPX (USD) et Crypto (USDT)
  selectedCategory: 'all',
  minVolume24hUsd: 5000000, // 5M USDT / Devise minimum
  maxSpreadPct: 0.15, // 0.15% maximum
  minHistoryDays: 60,
  excludeLeveragedTokens: true,
  excludeStableStable: true,
  excludeMonitoringZone: true,
  maxPairsToScan: 100,
  whitelist: ['CAC40/EUR', 'EUR/USD', 'USD/EUR', 'BTC/USDT', 'XAU/USD', 'SPX/USD'],
  blacklist: ['LOWVOL/USDT', 'WIDESPD/USDT'],
};

export const DEFAULT_EXCHANGE_CONFIG: ExchangeConfig = {
  apiKey: 'bnc_sec_49f81a72d3e098bc',
  apiSecret: '••••••••••••••••••••••••••••••••',
  isTestnet: false,
  isConnected: true,
  permissionsVerified: {
    spotTrading: true,
    reading: true,
    withdrawDisabled: true, // Crucial safety verification
  },
  ipWhitelisted: true,
  lastPingMs: 24,
  clockDriftMs: 4,
};

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '7192841924:AAH3k_J91uLqxP2_tradngbot_test',
  chatId: '-100293847192',
  isEnabled: true,
  isVerified: true,
  notifyStartStop: true,
  notifyEntries: true,
  notifyExits: true,
  notifyCircuitBreaker: true,
  notifyCriticalErrors: true,
  antiSpamBatching: true,
  dailySummary: true,
};

// Filter pairs according to specifications U1 - U6 and Multi-Market support
export function evaluatePairFilters(
  pair: MarketPair,
  config: UniverseConfig
): { isEligible: boolean; reason?: string } {
  // If explicitly blacklisted
  if (config.blacklist.includes(pair.symbol)) {
    return { isEligible: false, reason: 'Présent dans la liste noire' };
  }

  // If in manual mode, must be in whitelist
  if (config.filterMode === 'manual') {
    if (config.whitelist.includes(pair.symbol)) {
      return { isEligible: true };
    }
    return { isEligible: false, reason: 'Non présent dans la liste blanche manuelle' };
  }

  // If category filter is active
  if (config.selectedCategory && config.selectedCategory !== 'all') {
    if (pair.assetCategory !== config.selectedCategory) {
      return { isEligible: false, reason: `Actif hors catégorie ${config.selectedCategory}` };
    }
  }

  // If "all_pairs" mode (advanced, with caution)
  if (config.filterMode === 'all_pairs') {
    if (config.excludeLeveragedTokens && pair.isLeveraged) {
      return { isEligible: false, reason: 'Jeton à effet de levier (exclu d’office)' };
    }
    return { isEligible: true };
  }

  // Default "auto_filtered" mode
  if (config.quoteAsset !== 'ALL' && pair.quoteAsset !== config.quoteAsset) {
    return { isEligible: false, reason: `Devise de cotation non ${config.quoteAsset}` };
  }

  if (config.excludeLeveragedTokens && pair.isLeveraged) {
    return { isEligible: false, reason: 'Jeton à effet de levier exclu (UP/DOWN/BULL/BEAR)' };
  }

  if (config.excludeStableStable && pair.isStable) {
    return { isEligible: false, reason: 'Paire stable/stable exclue' };
  }

  if (config.excludeMonitoringZone && pair.isMonitoring) {
    return { isEligible: false, reason: 'Paire en zone de surveillance exchange' };
  }

  if (pair.volume24h < config.minVolume24hUsd) {
    return {
      isEligible: false,
      reason: `Volume 24h insuffisant (${(pair.volume24h / 1e6).toFixed(1)}M < ${(config.minVolume24hUsd / 1e6).toFixed(1)}M)`,
    };
  }

  if (pair.spreadPct > config.maxSpreadPct) {
    return {
      isEligible: false,
      reason: `Spread trop élevé (${pair.spreadPct.toFixed(2)}% > ${config.maxSpreadPct.toFixed(2)}%)`,
    };
  }

  return { isEligible: true };
}

// Format simulated Telegram message
export function buildTelegramMessage(
  title: string,
  symbol: string,
  details: string[],
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO'
): string {
  const icon =
    level === 'SUCCESS' ? '🟢' : level === 'WARN' ? '⚠️' : level === 'ERROR' ? '🚨' : 'ℹ️';
  return `${icon} <b>[Tradng_bot] ${title}</b>\n• Paire : <code>${symbol}</code>\n` +
    details.map((d) => `• ${d}`).join('\n') +
    `\n<i>${new Date().toLocaleTimeString('fr-FR', { timeZone: 'UTC' })} UTC</i>`;
}

// Initial mock state for Simulation mode (generates some initial simulated history for instant observability)
export function createInitialEngineState(mode: TradingMode): EngineState {
  const initialBalance = mode === 'simulation' ? 10000 : mode === 'testnet' ? 15000 : 2500;
  const now = Date.now();
  const dayMs = 86400 * 1000;

  // Initial demo positions for instant observability (including CAC 40 and Crypto)
  const initialPositions: Position[] =
    mode === 'simulation'
      ? [
          {
            id: 'pos_cac40_01',
            symbol: 'CAC40/EUR',
            side: 'LONG',
            mode: 'simulation',
            entryPrice: 7512.4,
            currentPrice: 7548.6,
            quantity: 0.25,
            costUsd: 1878.1,
            entryTime: now - 3600 * 1000 * 4,
            stopLossPrice: 7399.7,
            takeProfitPrice: 7737.8,
            stopLossType: 'STOP_LOSS_LIMIT',
            stopOrderIdOnExchange: 'ORD_SL_7399_CAC40',
            currentPnlUsd: 9.05,
            currentPnlPct: 0.48,
            feesPaidUsd: 1.88,
            status: 'OPEN',
          },
          {
            id: 'pos_btc_01',
            symbol: 'BTC/USDT',
            side: 'LONG',
            mode: 'simulation',
            entryPrice: 89800.0,
            currentPrice: 91420.5,
            quantity: 0.022,
            costUsd: 1975.6,
            entryTime: now - 3600 * 1000 * 5,
            stopLossPrice: 88453.0,
            takeProfitPrice: 92494.0,
            stopLossType: 'STOP_LOSS_LIMIT',
            stopOrderIdOnExchange: 'ORD_SL_88453_BTC',
            currentPnlUsd: 35.65,
            currentPnlPct: 1.8,
            feesPaidUsd: 1.98,
            status: 'OPEN',
          },
          {
            id: 'pos_sol_02',
            symbol: 'SOL/USDT',
            side: 'LONG',
            mode: 'simulation',
            entryPrice: 181.2,
            currentPrice: 186.4,
            quantity: 10.8,
            costUsd: 1956.96,
            entryTime: now - 3600 * 1000 * 3,
            stopLossPrice: 178.48,
            takeProfitPrice: 186.64,
            stopLossType: 'STOP_LOSS_LIMIT',
            stopOrderIdOnExchange: 'ORD_SL_17848_SOL',
            currentPnlUsd: 56.16,
            currentPnlPct: 2.87,
            feesPaidUsd: 1.95,
            status: 'OPEN',
          },
          {
            id: 'pos_eurusd_03',
            symbol: 'EUR/USD',
            side: 'LONG',
            mode: 'simulation',
            entryPrice: 1.0795,
            currentPrice: 1.0838,
            quantity: 1700,
            costUsd: 1835.15,
            entryTime: now - 3600 * 1000 * 2,
            stopLossPrice: 1.0633,
            takeProfitPrice: 1.1118,
            stopLossType: 'STOP_LOSS_LIMIT',
            stopOrderIdOnExchange: 'ORD_SL_10633_EURUSD',
            currentPnlUsd: 7.31,
            currentPnlPct: 0.40,
            feesPaidUsd: 1.83,
            status: 'OPEN',
          },
        ]
      : [];

  const initialTrades: Trade[] =
    mode === 'simulation'
      ? [
          {
            id: 'tr_cac40_00',
            symbol: 'CAC40/EUR',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 7420.0,
            exitPrice: 7525.5,
            quantity: 0.25,
            entryTime: now - dayMs * 1.8,
            exitTime: now - dayMs * 1.2,
            pnlUsd: 26.37,
            pnlPct: 1.42,
            feesUsd: 3.72,
            exitReason: 'TAKE_PROFIT',
            durationMinutes: 864,
          },
          {
            id: 'tr_eth_01',
            symbol: 'ETH/USDT',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 3320.0,
            exitPrice: 3419.6,
            quantity: 0.6,
            entryTime: now - dayMs * 1.5,
            exitTime: now - dayMs * 1.1,
            pnlUsd: 59.76,
            pnlPct: 3.0,
            feesUsd: 4.04,
            exitReason: 'TAKE_PROFIT',
            durationMinutes: 576,
          },
          {
            id: 'tr_near_02',
            symbol: 'NEAR/USDT',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 6.2,
            exitPrice: 6.386,
            quantity: 310,
            entryTime: now - dayMs * 2.2,
            exitTime: now - dayMs * 1.8,
            pnlUsd: 57.66,
            pnlPct: 3.0,
            feesUsd: 3.9,
            exitReason: 'TAKE_PROFIT',
            durationMinutes: 480,
          },
          {
            id: 'tr_link_03',
            symbol: 'LINK/USDT',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 18.1,
            exitPrice: 17.828,
            quantity: 105,
            entryTime: now - dayMs * 3.5,
            exitTime: now - dayMs * 3.2,
            pnlUsd: -28.56,
            pnlPct: -1.5,
            feesUsd: 3.77,
            exitReason: 'STOP_LOSS',
            durationMinutes: 360,
          },
          {
            id: 'tr_sui_04',
            symbol: 'SUI/USDT',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 2.95,
            exitPrice: 3.038,
            quantity: 650,
            entryTime: now - dayMs * 4.2,
            exitTime: now - dayMs * 3.8,
            pnlUsd: 57.2,
            pnlPct: 2.98,
            feesUsd: 3.89,
            exitReason: 'TAKE_PROFIT',
            durationMinutes: 420,
          },
          {
            id: 'tr_avax_05',
            symbol: 'AVAX/USDT',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 39.5,
            exitPrice: 38.907,
            quantity: 48,
            entryTime: now - dayMs * 5.1,
            exitTime: now - dayMs * 4.9,
            pnlUsd: -28.46,
            pnlPct: -1.5,
            feesUsd: 3.76,
            exitReason: 'STOP_LOSS',
            durationMinutes: 280,
          },
          {
            id: 'tr_doge_06',
            symbol: 'DOGE/USDT',
            side: 'BUY',
            mode: 'simulation',
            entryPrice: 0.235,
            exitPrice: 0.242,
            quantity: 8200,
            entryTime: now - dayMs * 6.3,
            exitTime: now - dayMs * 5.9,
            pnlUsd: 57.4,
            pnlPct: 2.98,
            feesUsd: 3.91,
            exitReason: 'TAKE_PROFIT',
            durationMinutes: 510,
          },
        ]
      : [];

  const initialLogs: AuditLog[] = [
    {
      id: 'log_01',
      timestamp: now - 3600 * 1000 * 8,
      level: 'INFO',
      category: 'ENGINE',
      message: 'Moteur Tradng_bot initialisé avec succès en mode simulation interne.',
    },
    {
      id: 'log_02',
      timestamp: now - 3600 * 1000 * 8,
      level: 'INFO',
      category: 'CONFIG',
      message: 'Stratégie EMA 9/21 + RSI 14 chargée sur timeframe 1h. Portefeuille max 5 positions, risque 2%.',
    },
    {
      id: 'log_03',
      timestamp: now - 3600 * 1000 * 5,
      level: 'INFO',
      category: 'ORDER',
      message: 'Signal BUY validé sur BTC/USDT (EMA9=89920 > EMA21=89410, RSI=58.2). Entrée au marché 89800.0 USDT.',
      symbol: 'BTC/USDT',
    },
    {
      id: 'log_04',
      timestamp: now - 3600 * 1000 * 5,
      level: 'INFO',
      category: 'ORDER',
      message: 'Ordre STOP_LOSS_LIMIT posé sur Binance : 88453.0 USDT. TP surveillé : 92494.0 USDT.',
      symbol: 'BTC/USDT',
    },
    {
      id: 'log_05',
      timestamp: now - 3600 * 1000 * 3,
      level: 'INFO',
      category: 'ORDER',
      message: 'Signal BUY validé sur SOL/USDT (EMA9=181.8 > EMA21=179.2, RSI=61.4). Entrée au marché 181.20 USDT.',
      symbol: 'SOL/USDT',
    },
  ];

  return {
    mode,
    status: 'running',
    balanceUsd: initialBalance - initialPositions.reduce((acc, p) => acc + p.costUsd, 0),
    startOfDayEquity: initialBalance,
    circuitBreakerUntil: null,
    lastScanTimestamp: now,
    positions: initialPositions,
    trades: initialTrades,
    logs: initialLogs,
    dailyPnlUsd: 91.81,
    dailyPnlPct: 0.92,
  };
}
