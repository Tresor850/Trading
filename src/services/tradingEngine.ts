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
  riskPerTradePct: 2.0, // Socle Concentré Agressif : Risque calibré à 2.0% par trade
  stopLossPct: 2.0, // Stop-Loss de secours (priorité au SL structurel SMC)
  takeProfitRatio: 2.5, // Ratio 1:2.5 calibré lors de l'entraînement SMC (Gain visé = 2.5x le risque)
  maxSimultaneousPositions: 2, // Mode Concentré : 2 positions simultanées maximales
  maxAllocationPerPositionPct: 48.0, // Allocation concentrée (~48% par position pour petits/moyens capitaux)
  dailyLossCircuitBreakerPct: 5.0, // 5% max daily drawdown
  circuitBreakerPauseHours: 24,
  maxEntriesPerCandle: 2,
  cooldownCandlesAfterExit: 3,
  maxConsecutiveLossesPerPair: 3,
  priorityRule: 'LIQUIDITY_DESC',
  stopLossMethod: 'ATR_VOLATILITY',
  atrMultiplier: 1.5,
  minNotionalUsd: 10,
  timeframe: '1h',
  minRiskRewardRatio: 2.5, // Filtre R:R >= 1:2.5 strict
  trendFilterEnabled: true, // Filtre de tendance EMA200 + régime BTC
  correlationFilterEnabled: true, // Filtre de corrélation multi-actifs actif
  circuitBreakerMode: 'ACTIVE_PROTECTIVE_CLOSE', // Protection stricte de sauvegarde du capital à -5%
};

export const DEFAULT_UNIVERSE_CONFIG: UniverseConfig = {
  filterMode: 'auto_filtered',
  quoteAsset: 'USDT',
  selectedCategory: 'all',
  minVolume24hUsd: 5000000, // 5M USDT minimum
  maxSpreadPct: 0.15, // 0.15% maximum
  minHistoryDays: 60,
  excludeLeveragedTokens: true,
  excludeStableStable: true,
  excludeMonitoringZone: true,
  maxPairsToScan: 50,
  whitelist: ['ADA/USDT', 'DOT/USDT', 'ETH/USDT', 'XRP/USDT'], // Sélection ciblée : Top 4 paires SMC gagnantes
  blacklist: [],
};

export const DEFAULT_EXCHANGE_CONFIG: ExchangeConfig = {
  apiKey: '',
  apiSecret: '',
  isTestnet: false,
  isConnected: false,
  permissionsVerified: { spotTrading: false, reading: false, withdrawDisabled: false },
  ipWhitelisted: false,
  lastPingMs: 0,
  clockDriftMs: 0,
};

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  isEnabled: false,
  isVerified: false,
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

// État initial vide : aucune position, aucun trade, aucun log fictif. Le capital de simulation est un paramètre (paper trading).
export function createInitialEngineState(mode: TradingMode): EngineState {
  const initialBalance = mode === 'simulation' ? 10000 : 0;
  const now = Date.now();
  return {
    mode,
    status: 'running',
    balanceUsd: initialBalance,
    startOfDayEquity: initialBalance,
    circuitBreakerUntil: null,
    lastScanTimestamp: now,
    positions: [],
    trades: [],
    logs: [{ id: 'log_init', timestamp: now, level: 'INFO', category: 'ENGINE', message: `Moteur démarré (${mode}). Aucune position ni historique.` }],
    dailyPnlUsd: 0,
    dailyPnlPct: 0,
  };
}
