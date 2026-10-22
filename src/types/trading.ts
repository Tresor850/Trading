export type TradingMode = 'simulation' | 'testnet' | 'live';

export type BotStatus = 'stopped' | 'running' | 'paused' | 'circuit_breaker' | 'emergency_stopped';

export type PairFilterMode = 'auto_filtered' | 'manual' | 'all_pairs';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AssetCategory = 'crypto' | 'index' | 'commodity' | 'forex' | 'stock';

export interface MarketPair {
  symbol: string;
  name?: string; // e.g. "CAC 40", "Bitcoin", "Or / Gold"
  assetCategory: AssetCategory;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number; // in USDT or base quote currency
  spreadPct: number;
  ema9: number;
  ema21: number;
  rsi14: number;
  atr14: number;
  isLeveraged: boolean; // UP/DOWN/BULL/BEAR
  isStable: boolean; // Stable/Stable
  isMonitoring: boolean; // Exchange monitoring tag
  isEligible: boolean;
  filterReason?: string;
  isEnabled: boolean; // User enabled/disabled
  activeSignal: 'NONE' | 'BUY_SIGNAL' | 'OVERBOUGHT' | 'COOLDOWN';
  consecutiveLosses: number;
  cooldownUntilTimestamp: number | null;
  candles: Candle[];
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG';
  mode: TradingMode;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  costUsd: number;
  entryTime: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  stopLossType: 'STOP_LOSS_LIMIT' | 'ATR_TRAILING';
  stopOrderIdOnExchange: string;
  currentPnlUsd: number;
  currentPnlPct: number;
  feesPaidUsd: number;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  closeReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'EMERGENCY_STOP' | 'DELISTING' | 'CIRCUIT_BREAKER';
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY';
  mode: TradingMode;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryTime: number;
  exitTime: number;
  pnlUsd: number;
  pnlPct: number;
  feesUsd: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'EMERGENCY_STOP' | 'DELISTING';
  durationMinutes: number;
}

export interface PortfolioRiskConfig {
  riskPerTradePct: number; // e.g. 2%
  stopLossPct: number; // e.g. 1.5%
  takeProfitRatio: number; // e.g. 2 -> 3%
  maxSimultaneousPositions: number; // e.g. 5
  maxAllocationPerPositionPct: number; // e.g. 20%
  dailyLossCircuitBreakerPct: number; // e.g. 5%
  circuitBreakerPauseHours: number; // 24h
  maxEntriesPerCandle: number; // e.g. 2
  cooldownCandlesAfterExit: number; // e.g. 3
  maxConsecutiveLossesPerPair: number; // e.g. 3
  priorityRule: 'LIQUIDITY_DESC' | 'RSI_MOMENTUM' | 'CHANGE_24H';
  stopLossMethod: 'FIXED_PCT' | 'ATR_VOLATILITY';
  atrMultiplier: number; // e.g. 1.5
  minNotionalUsd: number; // e.g. 10 USDT
  timeframe: '15m' | '1h' | '4h' | '1d';
}

export interface UniverseConfig {
  filterMode: PairFilterMode;
  quoteAsset: 'ALL' | 'USDT' | 'EUR' | 'USD' | 'USDC' | 'FDUSD';
  selectedCategory: 'all' | AssetCategory;
  minVolume24hUsd: number; // e.g. 5,000,000 $
  maxSpreadPct: number; // e.g. 0.15%
  minHistoryDays: number; // e.g. 60 days
  excludeLeveragedTokens: boolean;
  excludeStableStable: boolean;
  excludeMonitoringZone: boolean;
  maxPairsToScan: number; // e.g. 60
  whitelist: string[];
  blacklist: string[];
}

export interface ExchangeConfig {
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  isConnected: boolean;
  permissionsVerified: {
    spotTrading: boolean;
    reading: boolean;
    withdrawDisabled: boolean; // CRITICAL: must be TRUE (withdrawals must be disabled)
  };
  ipWhitelisted: boolean;
  lastPingMs: number;
  clockDriftMs: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
  isVerified: boolean;
  notifyStartStop: boolean;
  notifyEntries: boolean;
  notifyExits: boolean;
  notifyCircuitBreaker: boolean;
  notifyCriticalErrors: boolean;
  antiSpamBatching: boolean;
  dailySummary: boolean;
}

export interface DemoQualificationCriteria {
  minDurationDays: number; // e.g. 14
  minTradesCount: number; // e.g. 30
  minProfitFactor: number; // e.g. 1.25
  maxDrawdownPct: number; // e.g. 8.0
}

export interface AuditLog {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  category: 'ENGINE' | 'ORDER' | 'RISK' | 'TELEGRAM' | 'CONFIG' | 'AUTH';
  message: string;
  symbol?: string;
  metadata?: Record<string, unknown>;
}

export interface BacktestResult {
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  netProfitUsd: number;
  netProfitPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownUsd: number;
  sharpeRatio: number;
  averageTradeDurationHours: number;
  totalFeesPaidUsd: number;
  circuitBreakerTriggers: number;
  equityCurve: Array<{ timestamp: number; dateStr: string; equity: number; drawdownPct: number }>;
  trades: Trade[];
  pairBreakdown: Array<{
    symbol: string;
    tradesCount: number;
    winRate: number;
    pnlUsd: number;
    profitFactor: number;
  }>;
}

export interface SystemHealth {
  uptimeSeconds: number;
  vpsMode: boolean;
  osType: 'linux_vps' | 'windows' | 'macos';
  processStatus: 'active' | 'restarting' | 'idle';
  memoryUsageMb: number;
  cpuUsagePct: number;
  lastScanDurationMs: number;
  scannedPairsCount: number;
  lastHeartbeatTime: number;
}

export type UserRole = 'admin' | 'trader' | 'viewer';

export interface UserAccessKey {
  id: string;
  key: string; // e.g. "TRD-ADMIN-MASTER-2025" or "TRD-USER-A491-..."
  label: string; // e.g. "Alexandre - Spot VIP"
  email?: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number | null; // null = illimité
  status: 'active' | 'suspended' | 'revoked';
  canTradeLive: boolean;
  canUseTestnet: boolean;
  maxAllocatedBudgetUsd: number;
  assignedBinanceApiKey?: string;
  assignedBinanceApiSecret?: string;
  notes?: string;
  lastUsedAt?: number;
  createdByAdmin: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  accessKey: string;
  canTradeLive: boolean;
  canUseTestnet: boolean;
  maxAllocatedBudgetUsd: number;
  hasCustomBinanceKeys: boolean;
  binanceApiKey?: string;
  binanceApiSecret?: string;
  createdAt: number;
}

export interface BinanceAssetBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  valueUsd: number;
}

export interface RealBinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  brokered: boolean;
  accountType: string;
  updateTime: number;
  balances: BinanceAssetBalance[];
  totalSpotEquityUsd: number;
  freeUsdtBalance: number;
  isRealData: boolean;
}

