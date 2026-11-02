#!/usr/bin/env python3
"""FastAPI Backend pour le moteur SMC (Smart Money Concepts) - Tradng_bot.

Expose le moteur SMC et le filtrage d'univers Binance Spot (U1-U6, R4)
sous forme d'API REST pour l'application Trading_update.
"""

import asyncio
from dataclasses import asdict
import json
import os
import sys
from typing import Any, Dict, List, Optional
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd

# Ajout du dossier courant au sys.path pour importer smc_strategy_engine
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from smc_strategy_engine import (
    PairMetadata,
    RiskAndUniverseConfig,
    SMCSignal,
    SMCStrategyEngine,
    filter_spot_universe,
)

app = FastAPI(
    title="Tradng_bot - SMC Strategy Engine API",
    description="Microservice Python FastAPI pour l'évaluation SMC et le filtrage d'univers Binance Spot",
    version="1.0.0",
)

# Configuration CORS pour autoriser l'accès depuis Vite / React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instance globale de configuration et du moteur (Socle : Sélection Ciblée + Mode Concentré)
CONFIG_FILE = os.path.join(CURRENT_DIR, "trained_config.json")
if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r") as f:
            saved_data = json.load(f)
            current_config = RiskAndUniverseConfig(**saved_data)
            print(f"Configuration chargée depuis {CONFIG_FILE} : Mode Concentré Agressif ({current_config.max_positions} pos, max {current_config.max_allocation_pct}%)")
    except Exception as e:
        print(f"Avertissement lors du chargement de {CONFIG_FILE} : {e}")
        current_config = RiskAndUniverseConfig()
else:
    current_config = RiskAndUniverseConfig()

engine = SMCStrategyEngine(current_config)

BINANCE_API_BASE = "https://api.binance.com/api/v3"


# --- Modèles Pydantic pour validation des requêtes ---


class CandleModel(BaseModel):
    timestamp: Optional[int] = None
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class EvaluateRequest(BaseModel):
    symbol: str
    candles: List[CandleModel]
    equity_usd: float = Field(default=10000.0, ge=1.0)
    open_positions_count: int = Field(default=0, ge=0)
    daily_pnl_pct: float = Field(default=0.0)


class ConfigUpdateRequest(BaseModel):
    target_risk_pct: Optional[float] = None
    fallback_sl_pct: Optional[float] = None
    rr_ratio: Optional[float] = None
    max_positions: Optional[int] = None
    max_allocation_pct: Optional[float] = None
    daily_circuit_breaker_pct: Optional[float] = None
    cooldown_candles: Optional[int] = None
    swing_length: Optional[int] = None
    atr_period: Optional[int] = None
    sl_atr_buffer: Optional[float] = None
    min_sl_distance_pct: Optional[float] = None
    max_sl_distance_pct: Optional[float] = None
    min_fvg_atr_ratio: Optional[float] = None
    displacement_body_ratio: Optional[float] = None
    require_discount_zone: Optional[bool] = None
    quote_asset: Optional[str] = None
    min_volume_24h_usd: Optional[float] = None
    max_spread_pct: Optional[float] = None
    max_scanned_pairs: Optional[int] = None
    exclude_leveraged_tokens: Optional[bool] = None
    exclude_stable_to_stable: Optional[bool] = None
    exclude_monitoring_zone: Optional[bool] = None
    whitelist: Optional[List[str]] = None


class PairMetadataModel(BaseModel):
    symbol: str
    base_asset: str
    quote_asset: str
    volume_24h_usd: float
    bid_price: float
    ask_price: float
    in_monitoring_zone: bool = False


class FilterUniverseRequest(BaseModel):
    pairs: List[PairMetadataModel]


# --- Endpoints API ---


@app.get("/api/smc/health")
def health_check():
    """Vérifie la disponibilité du serveur Python et du moteur SMC."""
    return {
        "status": "online",
        "service": "SMCStrategyEngine FastAPI",
        "version": "1.0.0",
        "python_version": sys.version.split()[0],
        "config": asdict(engine.config),
    }


@app.get("/api/smc/config")
def get_config():
    """Retourne la configuration active du moteur SMC."""
    return asdict(engine.config)


@app.post("/api/smc/config")
def update_config(payload: ConfigUpdateRequest):
    """Met à jour dynamiquement les paramètres de risque et SMC."""
    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        if hasattr(engine.config, key) and value is not None:
            setattr(engine.config, key, value)
    return {
        "status": "updated",
        "config": asdict(engine.config),
    }


@app.post("/api/smc/evaluate")
def evaluate_candles(payload: EvaluateRequest):
    """Évalue une série de bougies OHLCV pour un symbole donné via SMC."""
    if len(payload.candles) < 30:
        return {
            "symbol": payload.symbol,
            "has_signal": False,
            "signal": None,
            "reason": f"Nombre insuffisant de bougies ({len(payload.candles)} < 30 minimum).",
        }

    # Conversion en DataFrame Pandas
    df_data = [
        {
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close,
            "volume": c.volume,
        }
        for c in payload.candles
    ]
    df = pd.DataFrame(df_data)

    signal = engine.evaluate_pair(
        symbol=payload.symbol,
        df=df,
        equity_usd=payload.equity_usd,
        open_positions_count=payload.open_positions_count,
        daily_pnl_pct=payload.daily_pnl_pct,
    )

    if signal is None:
        return {
            "symbol": payload.symbol,
            "has_signal": False,
            "signal": None,
        }

    return {
        "symbol": payload.symbol,
        "has_signal": True,
        "signal": asdict(signal),
    }


@app.post("/api/smc/filter_universe")
def filter_universe_endpoint(payload: FilterUniverseRequest):
    """Filtre une liste de paires fournie selon les exigences U1-U6 et R4."""
    meta_pairs = [
        PairMetadata(
            symbol=p.symbol,
            base_asset=p.base_asset,
            quote_asset=p.quote_asset,
            volume_24h_usd=p.volume_24h_usd,
            bid_price=p.bid_price,
            ask_price=p.ask_price,
            in_monitoring_zone=p.in_monitoring_zone,
        )
        for p in payload.pairs
    ]

    filtered = filter_spot_universe(meta_pairs, engine.config)
    return {
        "total_received": len(payload.pairs),
        "total_eligible": len(filtered),
        "eligible_pairs": [
            {
                "symbol": p.symbol,
                "base_asset": p.base_asset,
                "quote_asset": p.quote_asset,
                "volume_24h_usd": p.volume_24h_usd,
                "spread_pct": round(p.spread_pct, 4),
            }
            for p in filtered
        ],
    }


@app.get("/api/smc/scan_live")
async def scan_live_binance(
    equity: float = Query(default=10000.0, description="Capital total en USDT pour le dimensionnement"),
    max_pairs: int = Query(default=30, description="Nombre de paires à analyser"),
    timeframe: str = Query(default="1h", description="Timeframe des bougies (1h par défaut)"),
):
    """Scanne en direct les paires Binance Spot, applique les filtres U1-U6 et détecte les signaux SMC."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Récupération des tickers 24h
        ticker_res = await client.get(f"{BINANCE_API_BASE}/ticker/24hr")
        if ticker_res.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Erreur Binance API ({ticker_res.status_code})")

        all_tickers = ticker_res.json()

        # Construction des métadonnées
        pairs_meta: List[PairMetadata] = []
        for t in all_tickers:
            sym: str = t.get("symbol", "")
            if not sym.endswith("USDT"):
                continue
            base = sym[:-4]
            vol_usd = float(t.get("quoteVolume", 0.0))
            bid = float(t.get("bidPrice", 0.0))
            ask = float(t.get("askPrice", 0.0))
            pairs_meta.append(
                PairMetadata(
                    symbol=sym,
                    base_asset=base,
                    quote_asset="USDT",
                    volume_24h_usd=vol_usd,
                    bid_price=bid,
                    ask_price=ask,
                    in_monitoring_zone=False,
                )
            )

        # 2. Filtrage U1-U6 + tri décroissant de liquidité R4
        eligible = filter_spot_universe(pairs_meta, engine.config)
        to_scan = eligible[:max_pairs]

        # 3. Récupération concurrente des bougies et évaluation SMC
        signals_found: List[Dict[str, Any]] = []
        scanned_details: List[Dict[str, Any]] = []

        async def evaluate_single_pair(meta: PairMetadata):
            try:
                kl_res = await client.get(
                    f"{BINANCE_API_BASE}/klines",
                    params={"symbol": meta.symbol, "interval": timeframe, "limit": 100},
                )
                if kl_res.status_code != 200:
                    return
                rows = kl_res.json()
                if len(rows) < 30:
                    return

                # Exclusion de la bougie en cours non clôturée
                closed_rows = rows[:-1]
                df_data = [
                    {
                        "open": float(r[1]),
                        "high": float(r[2]),
                        "low": float(r[3]),
                        "close": float(r[4]),
                        "volume": float(r[5]),
                    }
                    for r in closed_rows
                ]
                df = pd.DataFrame(df_data)

                signal = engine.evaluate_pair(meta.symbol, df, equity_usd=equity)
                last_close = float(closed_rows[-1][4])

                detail = {
                    "symbol": meta.symbol,
                    "price": last_close,
                    "volume_24h_usd": meta.volume_24h_usd,
                    "spread_pct": round(meta.spread_pct, 4),
                    "has_signal": signal is not None,
                }
                scanned_details.append(detail)

                if signal:
                    signals_found.append(asdict(signal))
            except Exception as e:
                # Tolérance aux erreurs réseau sur une paire individuelle
                pass

        # Exécution par batch de 10 pour ne pas saturer l'API
        batch_size = 10
        for i in range(0, len(to_scan), batch_size):
            batch = to_scan[i : i + batch_size]
            await asyncio.gather(*[evaluate_single_pair(p) for p in batch])

        return {
            "status": "success",
            "timeframe": timeframe,
            "equity_usd": equity,
            "scanned_count": len(scanned_details),
            "total_eligible_universe": len(eligible),
            "signals_count": len(signals_found),
            "signals": signals_found,
            "scanned_pairs": scanned_details,
        }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("SMC_PORT", 8005))
    print(f"Démarrage du serveur SMC API sur http://127.0.0.1:{port} ...")
    uvicorn.run("api_server:app", host="127.0.0.1", port=port, reload=True)
