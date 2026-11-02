import { Candle } from '../types/trading';

export interface SMCSignalResult {
  symbol: string;
  signal_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  sl_distance_pct: number;
  tp_distance_pct: number;
  rr_ratio: number;
  position_size_usd: number;
  allocation_pct: number;
  effective_risk_pct: number;
  dealing_range_pct: number;
  notes: string;
}

export interface SMCHealthResponse {
  status: string;
  service: string;
  version: string;
  python_version: string;
  config: Record<string, any>;
}

export interface SMCScanLiveResponse {
  status: string;
  timeframe: string;
  equity_usd: number;
  scanned_count: number;
  total_eligible_universe: number;
  signals_count: number;
  signals: SMCSignalResult[];
  scanned_pairs: {
    symbol: string;
    price: number;
    volume_24h_usd: number;
    spread_pct: number;
    has_signal: boolean;
  }[];
}

export interface SMCEvaluateResponse {
  symbol: string;
  has_signal: boolean;
  signal: SMCSignalResult | null;
  reason?: string;
}

const SMC_BASE_URL = '/api/smc';

/**
 * Vérifie l'état de fonctionnement du serveur FastAPI Python SMC.
 */
export async function checkSMCHealth(): Promise<{ online: boolean; info?: SMCHealthResponse; error?: string }> {
  try {
    const res = await fetch(`${SMC_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { online: false, error: `Serveur HTTP ${res.status}` };
    }
    const info: SMCHealthResponse = await res.json();
    return { online: true, info };
  } catch (err: any) {
    return { online: false, error: err.message || 'Serveur SMC inaccessible' };
  }
}

/**
 * Envoie une liste de bougies au moteur SMC pour évaluation algorithmique.
 */
export async function evaluateSMCPair(
  symbol: string,
  candles: Candle[],
  equityUsd = 10000,
  openPositionsCount = 0,
  dailyPnlPct = 0
): Promise<SMCEvaluateResponse> {
  const cleanSymbol = symbol.replace('/', '');
  const payload = {
    symbol: cleanSymbol,
    candles: candles.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    })),
    equity_usd: equityUsd,
    open_positions_count: openPositionsCount,
    daily_pnl_pct: dailyPnlPct,
  };

  const res = await fetch(`${SMC_BASE_URL}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Erreur SMC evaluate : HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Déclenche un scan complet en direct sur Binance Spot via le moteur SMC Python.
 */
export async function scanLiveSMC(
  equityUsd = 10000,
  maxPairs = 30,
  timeframe = '1h'
): Promise<SMCScanLiveResponse> {
  const url = `${SMC_BASE_URL}/scan_live?equity=${equityUsd}&max_pairs=${maxPairs}&timeframe=${timeframe}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Erreur SMC scan_live : HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Récupère la configuration active du moteur SMC.
 */
export async function getSMCConfig(): Promise<Record<string, any>> {
  const res = await fetch(`${SMC_BASE_URL}/config`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Met à jour la configuration active du moteur SMC.
 */
export async function updateSMCConfig(params: Record<string, any>): Promise<Record<string, any>> {
  const res = await fetch(`${SMC_BASE_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
