#!/usr/bin/env python3
"""Étude de marché, comparaison des stratégies de trading sur le dernier trimestre
et entraînement / optimisation walk-forward du moteur SMC.
"""

from dataclasses import dataclass
import json
import os
import sys
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

# Ajout du dossier courant pour importer smc_strategy_engine
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from smc_strategy_engine import RiskAndUniverseConfig, SMCStrategyEngine

DATA_DIR = os.path.join(CURRENT_DIR, "..", "research", "data")
SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", "DOT", "LTC", "TRX"]

FEE = 0.001          # 0.10 % de frais par ordre
SLIPPAGE = 0.0005     # 0.05 % de glissement à l'exécution
CAPITAL_INITIAL = 10_000.0
QUARTER_HOURS = 90 * 24  # 2160 heures (3 mois)


@dataclass
class TradeRecord:
    symbol: str
    entry_time: int
    exit_time: int
    entry_price: float
    exit_price: float
    pnl_usd: float
    pnl_pct: float
    reason: str
    duration_hours: int


def load_all_candles() -> Dict[str, pd.DataFrame]:
    """Charge l'historique 1h des 12 paires depuis le cache research/data."""
    dfs: Dict[str, pd.DataFrame] = {}
    for s in SYMBOLS:
        filepath = os.path.join(DATA_DIR, f"{s}.json")
        if not os.path.exists(filepath):
            continue
        with open(filepath, "r") as f:
            raw = json.load(f)
        df = pd.DataFrame([
            {
                "t": x["t"],
                "open": float(x["o"]),
                "high": float(x["h"]),
                "low": float(x["l"]),
                "close": float(x["c"]),
            }
            for x in raw
        ])
        dfs[s] = df
    return dfs


# =====================================================================
# 1. ÉTUDE DU MARCHÉ SUR LE DERNIER TRIMESTRE (90 JOURS)
# =====================================================================

def analyze_market_regime(dfs: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    """Analyse quantitative de l'état du marché sur les 90 derniers jours."""
    results = {}
    quarter_returns = []
    volatilities = []
    trend_strengths = []

    for s, df in dfs.items():
        q_df = df.iloc[-QUARTER_HOURS:].copy()
        first_c = q_df["close"].iloc[0]
        last_c = q_df["close"].iloc[-1]
        ret_pct = ((last_c - first_c) / first_c) * 100.0
        quarter_returns.append(ret_pct)

        # Calcul de la volatilité horaire annualisée
        log_rets = np.log(q_df["close"] / q_df["close"].shift(1)).dropna()
        vol_ann = float(log_rets.std() * np.sqrt(365 * 24) * 100.0)
        volatilities.append(vol_ann)

        # ATR 14 moyen en % du prix
        tr = np.maximum(
            q_df["high"] - q_df["low"],
            np.maximum(
                (q_df["high"] - q_df["close"].shift(1)).abs(),
                (q_df["low"] - q_df["close"].shift(1)).abs(),
            ),
        )
        atr14 = tr.rolling(14).mean()
        atr_pct = float((atr14 / q_df["close"]).mean() * 100.0)

        # Régime par rapport à l'EMA 200
        ema200 = q_df["close"].ewm(span=200, adjust=False).mean()
        pct_above_ema200 = float((q_df["close"] > ema200).mean() * 100.0)
        trend_strengths.append(pct_above_ema200)

        # Drawdown maximal sur le trimestre
        cum_max = q_df["close"].cummax()
        drawdown_pct = float(((q_df["close"] - cum_max) / cum_max).min() * 100.0)

        results[s] = {
            "return_pct": round(ret_pct, 2),
            "volatility_ann_pct": round(vol_ann, 1),
            "atr_avg_pct": round(atr_pct, 2),
            "pct_above_ema200": round(pct_above_ema200, 1),
            "max_drawdown_pct": round(drawdown_pct, 2),
            "start_price": round(first_c, 4),
            "end_price": round(last_c, 4),
        }

    btc_info = results.get("BTC", {})
    avg_return = float(np.mean(quarter_returns))
    avg_vol = float(np.mean(volatilities))
    avg_above_ema = float(np.mean(trend_strengths))

    return {
        "pairs": results,
        "market_summary": {
            "avg_quarter_return_pct": round(avg_return, 2),
            "avg_volatility_pct": round(avg_vol, 1),
            "market_regime": (
                "FORTEMENT HAUSSIER" if avg_above_ema >= 65 and avg_return > 15
                else "HAUSSIER / VOLATILE" if avg_above_ema >= 50 and avg_return > 0
                else "RANGE / CONSOLIDATION" if 40 <= avg_above_ema < 50
                else "BAISSIER"
            ),
            "btc_performance_pct": btc_info.get("return_pct", 0.0),
            "btc_drawdown_pct": btc_info.get("max_drawdown_pct", 0.0),
        },
    }


# =====================================================================
# 2. MOTEUR DE SIMULATION MULTI-STRATÉGIES
# =====================================================================

def simulate_portfolio(
    dfs: Dict[str, pd.DataFrame],
    start_idx: int,
    end_idx: int,
    strategy_fn,
    config: RiskAndUniverseConfig,
    initial_cash: float = CAPITAL_INITIAL,
) -> Dict[str, Any]:
    """Exécute un backtest rigoureux multi-paires avec gestion du portefeuille."""
    cash = initial_cash
    equity_curve: List[float] = [cash]
    open_positions: List[Dict[str, Any]] = []
    trades: List[TradeRecord] = []
    daily_start_equity = initial_cash
    current_day_key = -1
    circuit_breaker_active = False

    # Préchauffage des indicateurs pour les stratégies nécessitant un historique
    warmup = 100

    for i in range(start_idx, end_idx):
        t_now = dfs["BTC"]["t"].iloc[i]
        day_key = t_now // (86400 * 1000)

        # Calcul de la valeur totale actuelle (Cash + positions ouvertes)
        current_equity = cash
        for pos in open_positions:
            curr_c = dfs[pos["symbol"]]["close"].iloc[i]
            current_equity += pos["qty"] * curr_c

        # Gestion du Circuit Breaker Journalier (minuit UTC)
        if day_key != current_day_key:
            current_day_key = day_key
            daily_start_equity = current_equity
            circuit_breaker_active = False

        daily_drawdown_pct = ((daily_start_equity - current_equity) / daily_start_equity) * 100.0
        if daily_drawdown_pct >= config.daily_circuit_breaker_pct and not circuit_breaker_active:
            circuit_breaker_active = True
            # Clôture d'urgence de toutes les positions au prix du marché
            for pos in open_positions:
                px = dfs[pos["symbol"]]["close"].iloc[i] * (1.0 - SLIPPAGE)
                exit_fee = pos["qty"] * px * FEE
                net_pnl = pos["qty"] * (px - pos["entry"]) - pos["entry_fee"] - exit_fee
                cash += pos["qty"] * px - exit_fee
                trades.append(TradeRecord(
                    symbol=pos["symbol"],
                    entry_time=pos["entry_time"],
                    exit_time=t_now,
                    entry_price=pos["entry"],
                    exit_price=px,
                    pnl_usd=net_pnl,
                    pnl_pct=(net_pnl / pos["cost"]) * 100.0,
                    reason="CIRCUIT_BREAKER",
                    duration_hours=i - pos["entry_idx"],
                ))
            open_positions = []

        # 1. Vérification des Stop-Loss et Take-Profit des positions en cours
        remaining_positions = []
        for pos in open_positions:
            c = dfs[pos["symbol"]].iloc[i]
            hit_sl = c["low"] <= pos["sl"]
            hit_tp = c["high"] >= pos["tp"]

            if hit_sl:
                # Exécution SL au prix du stop avec glissement
                px = pos["sl"] * (1.0 - SLIPPAGE)
                exit_fee = pos["qty"] * px * FEE
                net_pnl = pos["qty"] * (px - pos["entry"]) - pos["entry_fee"] - exit_fee
                cash += pos["qty"] * px - exit_fee
                trades.append(TradeRecord(
                    symbol=pos["symbol"],
                    entry_time=pos["entry_time"],
                    exit_time=t_now,
                    entry_price=pos["entry"],
                    exit_price=px,
                    pnl_usd=net_pnl,
                    pnl_pct=(net_pnl / pos["cost"]) * 100.0,
                    reason="STOP_LOSS",
                    duration_hours=i - pos["entry_idx"],
                ))
            elif hit_tp:
                # Exécution TP au prix cible
                px = pos["tp"]
                exit_fee = pos["qty"] * px * FEE
                net_pnl = pos["qty"] * (px - pos["entry"]) - pos["entry_fee"] - exit_fee
                cash += pos["qty"] * px - exit_fee
                trades.append(TradeRecord(
                    symbol=pos["symbol"],
                    entry_time=pos["entry_time"],
                    exit_time=t_now,
                    entry_price=pos["entry"],
                    exit_price=px,
                    pnl_usd=net_pnl,
                    pnl_pct=(net_pnl / pos["cost"]) * 100.0,
                    reason="TAKE_PROFIT",
                    duration_hours=i - pos["entry_idx"],
                ))
            else:
                remaining_positions.append(pos)

        open_positions = remaining_positions

        # 2. Génération de nouveaux signaux si le circuit breaker n'est pas actif
        if not circuit_breaker_active and len(open_positions) < config.max_positions:
            open_syms = {p["symbol"] for p in open_positions}
            slots_left = config.max_positions - len(open_positions)

            # Recherche des signaux sur toutes les paires éligibles
            signals = strategy_fn(dfs, i, open_syms, current_equity)
            for sig in signals[:slots_left]:
                # Calcul de la taille de position par le risque
                entry_px = sig["entry_price"] * (1.0 + SLIPPAGE)
                sl_px = sig["stop_loss"]
                sl_dist_pct = abs(entry_px - sl_px) / entry_px
                if sl_dist_pct <= 0:
                    continue

                risk_usd = current_equity * (config.target_risk_pct / 100.0)
                pos_usd_ideal = risk_usd / sl_dist_pct
                pos_usd_cap = current_equity * (config.max_allocation_pct / 100.0)
                pos_size_usd = min(pos_usd_ideal, pos_usd_cap, cash * 0.95)

                if pos_size_usd < 15.0 or cash < pos_size_usd * (1.0 + FEE):
                    continue

                entry_fee = pos_size_usd * FEE
                cash -= (pos_size_usd + entry_fee)
                qty = pos_size_usd / entry_px

                open_positions.append({
                    "symbol": sig["symbol"],
                    "entry": entry_px,
                    "sl": sl_px,
                    "tp": sig["take_profit"],
                    "qty": qty,
                    "cost": pos_size_usd,
                    "entry_fee": entry_fee,
                    "entry_time": t_now,
                    "entry_idx": i,
                })

        # Enregistrement de l'équité totale en fin d'heure
        eq_end = cash + sum(p["qty"] * dfs[p["symbol"]]["close"].iloc[i] for p in open_positions)
        equity_curve.append(eq_end)

    # Clôture des positions restantes à la dernière bougie
    final_time = dfs["BTC"]["t"].iloc[end_idx - 1]
    for pos in open_positions:
        px = dfs[pos["symbol"]]["close"].iloc[end_idx - 1]
        exit_fee = pos["qty"] * px * FEE
        net_pnl = pos["qty"] * (px - pos["entry"]) - pos["entry_fee"] - exit_fee
        cash += pos["qty"] * px - exit_fee
        trades.append(TradeRecord(
            symbol=pos["symbol"],
            entry_time=pos["entry_time"],
            exit_time=final_time,
            entry_price=pos["entry"],
            exit_price=px,
            pnl_usd=net_pnl,
            pnl_pct=(net_pnl / pos["cost"]) * 100.0,
            reason="END_PERIOD",
            duration_hours=end_idx - 1 - pos["entry_idx"],
        ))

    final_equity = cash
    total_net_pnl = final_equity - initial_cash
    net_return_pct = (total_net_pnl / initial_cash) * 100.0

    # Métriques statistiques
    winning_trades = [t for t in trades if t.pnl_usd > 0]
    losing_trades = [t for t in trades if t.pnl_usd <= 0]
    gross_win = sum(t.pnl_usd for t in winning_trades)
    gross_loss = abs(sum(t.pnl_usd for t in losing_trades))
    profit_factor = round(gross_win / gross_loss, 2) if gross_loss > 0 else (9.99 if gross_win > 0 else 0.0)
    win_rate = (len(winning_trades) / len(trades) * 100.0) if trades else 0.0

    # Max Drawdown sur la courbe d'équité
    eq_series = pd.Series(equity_curve)
    cummax = eq_series.cummax()
    dd_pct = float(((eq_series - cummax) / cummax).min() * 100.0)

    return {
        "final_equity": round(final_equity, 2),
        "net_pnl_usd": round(total_net_pnl, 2),
        "return_pct": round(net_return_pct, 2),
        "total_trades": len(trades),
        "win_rate_pct": round(win_rate, 1),
        "profit_factor": profit_factor,
        "max_drawdown_pct": round(dd_pct, 2),
        "trades": trades,
    }


# =====================================================================
# 3. DÉFINITION DES STRATÉGIES À COMPARER
# =====================================================================

def make_strategy_ema_rsi(trend_filter: bool = True):
    """Stratégie 1 : Croisement EMA 9/21 + RSI 14 < 70 + Filtre Tendance EMA 200."""
    def strategy(dfs, i, open_syms, equity):
        signals = []
        for s in SYMBOLS:
            if s in open_syms:
                continue
            df = dfs[s]
            if i < 205:
                continue
            sub = df["close"].iloc[i-205 : i+1]
            e9 = sub.ewm(span=9, adjust=False).mean()
            e21 = sub.ewm(span=21, adjust=False).mean()
            e200 = sub.ewm(span=200, adjust=False).mean()
            diff = sub.diff()
            up = diff.clip(lower=0)
            dn = -diff.clip(upper=0)
            roll_up = up.rolling(14).mean()
            roll_dn = dn.rolling(14).mean()
            rs = roll_up / (roll_dn + 1e-9)
            rsi = 100 - (100 / (1 + rs))

            curr_c = sub.iloc[-1]
            prev_e9, curr_e9 = e9.iloc[-2], e9.iloc[-1]
            prev_e21, curr_e21 = e21.iloc[-2], e21.iloc[-1]
            curr_r = rsi.iloc[-1]

            # Signal d'achat : EMA9 croise à la hausse EMA21, RSI < 70
            is_cross = curr_e9 > curr_e21 and prev_e9 <= prev_e21 and curr_r < 70
            if is_cross:
                if trend_filter and curr_c <= e200.iloc[-1]:
                    continue
                # Stop loss fixe à 1.5 % et Take Profit à 3.0 % (R:R 2.0)
                sl = curr_c * 0.985
                tp = curr_c * 1.03
                signals.append({"symbol": s, "entry_price": curr_c, "stop_loss": sl, "take_profit": tp})
        return signals
    return strategy


def make_strategy_donchian_breakout():
    """Stratégie 2 : Cassure de Donchian 20 périodes sur 4h (Trend Following)."""
    def strategy(dfs, i, open_syms, equity):
        signals = []
        for s in SYMBOLS:
            if s in open_syms:
                continue
            df = dfs[s]
            if i < 100:
                continue
            sub = df.iloc[i-80 : i+1]  # ~20 bougies 4h = 80 bougies 1h
            high_20 = sub["high"].iloc[:-1].max()
            curr_c = sub["close"].iloc[-1]
            ema200 = sub["close"].ewm(span=200, adjust=False).mean().iloc[-1] if len(df) > 200 else 0

            if curr_c > high_20 and curr_c > ema200:
                atr = (sub["high"] - sub["low"]).iloc[-14:].mean()
                sl = curr_c - 2.0 * atr
                tp = curr_c + 4.0 * atr  # R:R 2.0
                signals.append({"symbol": s, "entry_price": curr_c, "stop_loss": sl, "take_profit": tp})
        return signals
    return strategy


def make_strategy_smc(engine: SMCStrategyEngine):
    """Stratégie 3 : Moteur Smart Money Concepts complet."""
    def strategy(dfs, i, open_syms, equity):
        signals = []
        for s in SYMBOLS:
            if s in open_syms:
                continue
            df = dfs[s]
            if i < 70:
                continue
            sub_df = df.iloc[i-65 : i+1]
            sig = engine.evaluate_pair(s, sub_df, equity_usd=equity)
            if sig:
                signals.append({
                    "symbol": s,
                    "entry_price": sig.entry_price,
                    "stop_loss": sig.stop_loss,
                    "take_profit": sig.take_profit,
                    "signal_type": sig.signal_type,
                })
        return signals
    return strategy


# =====================================================================
# 4. ENTRAÎNEMENT & OPTIMISATION WALK-FORWARD DU MOTEUR SMC
# =====================================================================

def train_and_optimize_smc(
    dfs: Dict[str, pd.DataFrame],
    train_start: int,
    train_end: int,
    test_start: int,
    test_end: int,
) -> Dict[str, Any]:
    """Effectue une recherche systématique des hyperparamètres sur la période de Train

    puis évalue le modèle calibré sur la période Out-of-Sample (Test).
    """
    print(f"-> Début de l'entraînement SMC...")
    print(f"   Train (In-Sample) : {train_end - train_start} heures (~{(train_end - train_start)//24} jours)")
    print(f"   Test (Out-of-Sample) : {test_end - test_start} heures (~{(test_end - test_start)//24} jours)")

    # Grille d'hyperparamètres à explorer
    param_grid = [
        # (swing_len, atr_buf, rr, discount, min_sl_pct, max_sl_pct)
        (3, 0.25, 2.0, True, 0.5, 4.0),
        (3, 0.35, 2.5, True, 0.6, 4.0),
        (4, 0.25, 2.0, True, 0.5, 4.0),
        (4, 0.35, 2.5, True, 0.6, 4.0),
        (4, 0.35, 2.0, False, 0.5, 4.0),
        (5, 0.35, 2.5, True, 0.6, 4.0),  # Baseline d'origine
        (5, 0.20, 2.0, True, 0.5, 3.5),
        (3, 0.20, 2.2, True, 0.5, 3.5),
    ]

    best_score = -999.0
    best_config: Optional[RiskAndUniverseConfig] = None
    best_train_res = None
    grid_results = []

    for params in param_grid:
        swing_len, atr_buf, rr, disc, min_sl, max_sl = params
        cfg = RiskAndUniverseConfig(
            swing_length=swing_len,
            sl_atr_buffer=atr_buf,
            rr_ratio=rr,
            require_discount_zone=disc,
            min_sl_distance_pct=min_sl,
            max_sl_distance_pct=max_sl,
            target_risk_pct=0.75,
            max_allocation_pct=20.0,
            max_positions=5,
        )
        eng = SMCStrategyEngine(cfg)
        strat = make_strategy_smc(eng)
        res = simulate_portfolio(dfs, train_start, train_end, strat, cfg)

        # Score composite : Favorise un net PnL positif, un Profit Factor élevé et au moins 15 trades
        n_trades = res["total_trades"]
        if n_trades >= 15:
            # Score combinant rendement et contrôle du risque
            score = res["return_pct"] * (res["profit_factor"] if res["profit_factor"] > 0 else 0.5)
        else:
            score = -50.0 + n_trades  # Pénalité pour manque d'activité statistique

        grid_results.append({
            "params": params,
            "return_pct": res["return_pct"],
            "trades": n_trades,
            "win_rate": res["win_rate_pct"],
            "pf": res["profit_factor"],
            "max_dd": res["max_drawdown_pct"],
            "score": round(score, 2),
        })

        if score > best_score:
            best_score = score
            best_config = cfg
            best_train_res = res

    # Évaluation OUT-OF-SAMPLE sur le dernier trimestre avec la config optimale
    optimal_engine = SMCStrategyEngine(best_config)
    optimal_strat = make_strategy_smc(optimal_engine)
    test_res = simulate_portfolio(dfs, test_start, test_end, optimal_strat, best_config)

    # Évaluation de la config initiale par défaut sur le test (pour comparaison avant/après)
    default_cfg = RiskAndUniverseConfig()
    default_engine = SMCStrategyEngine(default_cfg)
    default_strat = make_strategy_smc(default_engine)
    default_test_res = simulate_portfolio(dfs, test_start, test_end, default_strat, default_cfg)

    return {
        "grid_results": grid_results,
        "best_config": best_config,
        "best_train_res": best_train_res,
        "default_test_res": default_test_res,
        "optimal_test_res": test_res,
    }


def main():
    print("==================================================================")
    print("   ÉTUDE DE MARCHÉ & ENTRAÎNEMENT SMC - TRADNG_BOT (BINANCE SPOT)  ")
    print("==================================================================")

    dfs = load_all_candles()
    if not dfs:
        print("Erreur : Impossible de charger les données.")
        return

    total_candles = len(dfs["BTC"])
    test_hours = QUARTER_HOURS
    test_start = total_candles - test_hours
    test_end = total_candles
    train_start = max(0, test_start - (365 * 24))  # 12 mois de train
    train_end = test_start

    print(f"Total bougies disponibles : {total_candles} heures (~{total_candles // (24 * 30)} mois)")
    print(f"Période d'évaluation Trimestrielle : dernières {test_hours} heures ({test_hours // 24} jours)")

    # 1. Analyse de marché
    market_study = analyze_market_regime(dfs)
    summary = market_study["market_summary"]
    print("\n--- 1. ÉTAT & RÉGIME DU MARCHÉ (DERNIER TRIMESTRE) ---")
    print(f"• Régime global détecté  : {summary['market_regime']}")
    print(f"• Performance moyenne Top 12 : {summary['avg_quarter_return_pct']:+.2f}%")
    print(f"• Performance Bitcoin (BTC)  : {summary['btc_performance_pct']:+.2f}% (Max Drawdown: {summary['btc_drawdown_pct']}%)")
    print(f"• Volatilité annuelle moyenne : {summary['avg_volatility_pct']:.1f}%")

    # 2. Benchmark des stratégies sur le dernier trimestre
    print("\n--- 2. BENCHMARK COMPARATIF DES STRATÉGIES SUR LE DERNIER TRIMESTRE ---")
    cfg_base = RiskAndUniverseConfig()

    # Stratégie EMA / RSI
    ema_strat = make_strategy_ema_rsi(trend_filter=True)
    res_ema = simulate_portfolio(dfs, test_start, test_end, ema_strat, cfg_base)

    # Stratégie Donchian
    donchian_strat = make_strategy_donchian_breakout()
    res_donchian = simulate_portfolio(dfs, test_start, test_end, donchian_strat, cfg_base)

    # Entraînement et optimisation SMC
    training = train_and_optimize_smc(dfs, train_start, train_end, test_start, test_end)
    res_smc_baseline = training["default_test_res"]
    res_smc_optimal = training["optimal_test_res"]

    # Tableau comparatif
    strats = [
        ("Achat Conservateur (Hold Équipondéré)", summary["avg_quarter_return_pct"], "N/A", "N/A", "N/A", "N/A"),
        ("EMA 9/21 + Filtre RSI 14 (1h)", res_ema["return_pct"], res_ema["total_trades"], f"{res_ema['win_rate_pct']}%", res_ema["profit_factor"], f"{res_ema['max_drawdown_pct']}%"),
        ("Cassure Donchian (4h)", res_donchian["return_pct"], res_donchian["total_trades"], f"{res_donchian['win_rate_pct']}%", res_donchian["profit_factor"], f"{res_donchian['max_drawdown_pct']}%"),
        ("SMC (Configuration Initiale)", res_smc_baseline["return_pct"], res_smc_baseline["total_trades"], f"{res_smc_baseline['win_rate_pct']}%", res_smc_baseline["profit_factor"], f"{res_smc_baseline['max_drawdown_pct']}%"),
        ("SMC Entraîné & Calibré (Optimal)", res_smc_optimal["return_pct"], res_smc_optimal["total_trades"], f"{res_smc_optimal['win_rate_pct']}%", res_smc_optimal["profit_factor"], f"{res_smc_optimal['max_drawdown_pct']}%"),
    ]

    print("\n| Stratégie | Rendement Net (3 mois) | Trades | Win Rate | Profit Factor | Max Drawdown |")
    print("|---|---|---|---|---|---|")
    for name, ret, n, wr, pf, dd in strats:
        print(f"| {name} | {ret if isinstance(ret, str) else f'{ret:+.2f}%'} | {n} | {wr} | {pf} | {dd} |")

    # 3. Rapport d'entraînement
    best_c = training["best_config"]
    print("\n--- 3. RÉSULTATS DE L'ENTRAÎNEMENT & PARAMÈTRES RETENUS ---")
    print(f"• Swing Length (Pivots fractals) : {best_c.swing_length} bougies (vs 5 avant)")
    print(f"• Stop-Loss ATR Buffer           : {best_c.sl_atr_buffer} ATR (vs 0.35 avant)")
    print(f"• Ratio Gain/Risque cible (R:R)  : 1:{best_c.rr_ratio} (Take Profit)")
    print(f"• Exigence Zone Discount (<50%)   : {best_c.require_discount_zone}")
    print(f"• Bornes distance SL             : [{best_c.min_sl_distance_pct}%, {best_c.max_sl_distance_pct}%]")
    print(f"\n-> Progression SMC sur le trimestre de test : Rendement Net {res_smc_baseline['return_pct']:+.2f}% -> {res_smc_optimal['return_pct']:+.2f}%")

    # 4. Sauvegarde des hyperparamètres entraînés dans api_server.py / config JSON
    config_output_path = os.path.join(CURRENT_DIR, "trained_config.json")
    with open(config_output_path, "w") as f:
        json.dump({
            "target_risk_pct": best_c.target_risk_pct,
            "fallback_sl_pct": best_c.fallback_sl_pct,
            "rr_ratio": best_c.rr_ratio,
            "max_positions": best_c.max_positions,
            "max_allocation_pct": best_c.max_allocation_pct,
            "daily_circuit_breaker_pct": best_c.daily_circuit_breaker_pct,
            "cooldown_candles": best_c.cooldown_candles,
            "swing_length": best_c.swing_length,
            "atr_period": best_c.atr_period,
            "sl_atr_buffer": best_c.sl_atr_buffer,
            "min_sl_distance_pct": best_c.min_sl_distance_pct,
            "max_sl_distance_pct": best_c.max_sl_distance_pct,
            "min_fvg_atr_ratio": best_c.min_fvg_atr_ratio,
            "displacement_body_ratio": best_c.displacement_body_ratio,
            "require_discount_zone": best_c.require_discount_zone,
            "quote_asset": best_c.quote_asset,
            "min_volume_24h_usd": best_c.min_volume_24h_usd,
            "max_spread_pct": best_c.max_spread_pct,
            "max_scanned_pairs": best_c.max_scanned_pairs,
            "exclude_leveraged_tokens": best_c.exclude_leveraged_tokens,
            "exclude_stable_to_stable": best_c.exclude_stable_to_stable,
            "exclude_monitoring_zone": best_c.exclude_monitoring_zone,
        }, f, indent=2)
    print(f"Configuration optimale sauvegardée avec succès dans : {config_output_path}")


if __name__ == "__main__":
    main()
