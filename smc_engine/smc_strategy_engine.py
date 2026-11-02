#!/usr/bin/env python3
"""Moteur algorithmique Smart Money Concepts (SMC) pour tradng_bot (Binance Spot).

Ce module implémente :
1. Le filtrage de sécurité de l'univers multi-paires (Exigences U1 à U6 et Règle R4).
2. La détection algorithmique SMC (Swing Highs/Lows, Zone Discount/Premium,
   Liquidity Sweep SSL, cassures BOS/CHoCH avec Displacement, Fair Value Gaps
   et Order Blocks haussiers non mitigés).
3. Le dimensionnement dynamique des positions Spot (sans effet de levier) basé sur
   un Stop-Loss structurel (sous l'Order Block / Sweep + marge ATR), tout en
   respectant le plafond d'allocation par position (20 %), le délai de repos (R5)
   et le Circuit Breaker journalier.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


@dataclass
class RiskAndUniverseConfig:
    """Paramètres du module 'Risque & Univers' adaptés à la stratégie SMC Spot (Mode Concentré Agressif)."""

    # --- Gestion du Risque (Mode Concentré Agressif) ---
    target_risk_pct: float = 2.0           # Risque visé par trade (2.0 % pour mode concentré)
    fallback_sl_pct: float = 2.5           # Stop-loss de secours (%) si SL structurel indisponible
    rr_ratio: float = 2.5                  # Ratio Gain / Risque minimal (ex: 1:2.5)
    max_positions: int = 2                 # Nombre maximal de positions simultanées (2 positions concentrées)
    max_allocation_pct: float = 48.0       # Allocation maximale par position (~48 % par trade)
    daily_circuit_breaker_pct: float = 5.0 # Pause 24h si perte journalière >= 5.0 %
    cooldown_candles: int = 6              # Délai de repos par paire (R5) en bougies

    # --- Paramètres SMC (Méthode S5 : Structurel + ATR) ---
    swing_length: int = 5                  # Nombre de bougies de part et d'autre d'un pivot (fractale)
    atr_period: int = 14                   # Période de l'ATR pour le coussin de sécurité du Stop-Loss
    sl_atr_buffer: float = 0.35            # Marge sous le creux structurel (en multiple d'ATR)
    min_sl_distance_pct: float = 0.60      # Distance minimale du SL (%) pour éviter le bruit
    max_sl_distance_pct: float = 4.00      # Distance maximale du SL (%) au-delà de laquelle le signal est ignoré
    min_fvg_atr_ratio: float = 0.25        # Taille minimale d'un FVG par rapport à l'ATR
    displacement_body_ratio: float = 0.60  # Ratio corps/mèche minimal pour valider une bougie d'impulsion
    require_discount_zone: bool = True     # Exiger que le prix soit sous l'équilibre (< 50 % du range)

    # --- Univers Multi-Paires & Sélection Ciblée ---
    quote_asset: str = "USDT"              # Devise de cotation unique
    min_volume_24h_usd: float = 10_000_000 # Volume 24h minimal (10 M$)
    max_spread_pct: float = 0.08           # Spread bid/ask maximal autorisé (0.08 %)
    max_scanned_pairs: int = 10            # Plafond de paires scannées
    exclude_leveraged_tokens: bool = True  # Exclure UP/DOWN/BULL/BEAR
    exclude_stable_to_stable: bool = True  # Exclure USDC/USDT, FDUSD/USDT, etc.
    exclude_monitoring_zone: bool = True   # Exclure la zone de surveillance Binance
    whitelist: Optional[List[str]] = None  # Sélection ciblée (ex: ["ADAUSDT", "DOTUSDT", "ETHUSDT", "XRPUSDT"])


@dataclass
class PairMetadata:
    """Métadonnées temps réel d'une paire Binance Spot pour le filtrage U1-U6."""

    symbol: str
    base_asset: str
    quote_asset: str
    volume_24h_usd: float
    bid_price: float
    ask_price: float
    in_monitoring_zone: bool = False

    @property
    def spread_pct(self) -> float:
        if self.bid_price <= 0:
            return 999.0
        return ((self.ask_price - self.bid_price) / self.bid_price) * 100.0


@dataclass
class PointOfInterest:
    """Zone d'intérêt SMC (Order Block haussier ou Fair Value Gap haussier)."""

    kind: str               # "OB_BULLISH" ou "FVG_BULLISH"
    created_at_idx: int     # Index de création
    top: float              # Borne supérieure de la zone (prix d'entrée limite)
    bottom: float           # Borne inférieure de la zone (invalidation structurelle)
    structural_low: float   # Plus bas du balayage (Sweep) ou de l'OB pour poser le SL
    mitigated: bool = False

    @property
    def midpoint(self) -> float:
        """Consequent Encroachment (50 % de la zone)."""
        return 0.5 * (self.top + self.bottom)


@dataclass
class SMCSignal:
    """Signal d'achat complet généré par le moteur SMC avec gestion du risque."""

    symbol: str
    signal_type: str        # Ex: "CHoCH_BULLISH+OB_BULLISH" ou "BOS_BULLISH+FVG_BULLISH"
    entry_price: float
    stop_loss: float
    take_profit: float
    sl_distance_pct: float
    tp_distance_pct: float
    rr_ratio: float
    position_size_usd: float
    allocation_pct: float
    effective_risk_pct: float
    dealing_range_pct: float
    notes: str = ""


STABLECOINS = {"USDT", "USDC", "FDUSD", "TUSD", "DAI", "BUSD", "USDP", "EUR", "AEUR"}
LEVERAGED_SUFFIXES = ("UP", "DOWN", "BULL", "BEAR", "3L", "3S", "5L", "5S")


def filter_spot_universe(
    pairs: List[PairMetadata],
    config: RiskAndUniverseConfig,
) -> List[PairMetadata]:
    """Filtre et trie l'univers multi-paires selon les exigences U1 à U6 et R4."""
    filtered: List[PairMetadata] = []

    for p in pairs:
        # 0. Sélection ciblée (Whitelist)
        if config.whitelist and (p.symbol not in config.whitelist and p.base_asset not in config.whitelist):
            continue

        # 1. Devise de cotation unique (évite doublons d'exposition et rejets de solde)
        if config.quote_asset != "ALL" and p.quote_asset != config.quote_asset:
            continue

        # 2. Exclusion des jetons à levier (UP/DOWN)
        if config.exclude_leveraged_tokens and p.base_asset.endswith(LEVERAGED_SUFFIXES):
            continue

        # 3. Exclusion des paires Stable / Stable
        if config.exclude_stable_to_stable and p.base_asset in STABLECOINS:
            continue

        # 4. Exclusion de la zone de surveillance Binance (Monitoring Tag)
        if config.exclude_monitoring_zone and p.in_monitoring_zone:
            continue

        # 5. Volume 24h minimal et Spread maximal
        if p.volume_24h_usd < config.min_volume_24h_usd:
            continue
        if p.spread_pct > config.max_spread_pct:
            continue

        filtered.append(p)

    # Règle de priorité R4 : Liquidité 24h décroissante
    filtered.sort(key=lambda item: item.volume_24h_usd, reverse=True)
    return filtered[: config.max_scanned_pairs]


class SMCStrategyEngine:
    """Moteur d'analyse Smart Money Concepts et de gestion du risque en Spot."""

    def __init__(self, config: Optional[RiskAndUniverseConfig] = None) -> None:
        self.config = config or RiskAndUniverseConfig()
        self.last_exit_candle_idx: Dict[str, int] = {}

    @staticmethod
    def compute_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calcule l'Average True Range (ATR)."""
        high_low = df["high"] - df["low"]
        high_close = (df["high"] - df["close"].shift(1)).abs()
        low_close = (df["low"] - df["close"].shift(1)).abs()
        tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return tr.rolling(window=period, min_periods=1).mean()

    def detect_swings(self, df: pd.DataFrame) -> Tuple[List[Tuple[int, float]], List[Tuple[int, float]]]:
        """Identifie les Swing Highs et Swing Lows confirmés par fractales de longueur L."""
        length = self.config.swing_length
        highs = df["high"].to_numpy()
        lows = df["low"].to_numpy()
        n = len(df)

        swing_highs: List[Tuple[int, float]] = []
        swing_lows: List[Tuple[int, float]] = []

        for i in range(length, n - length):
            window_highs = highs[i - length : i + length + 1]
            if highs[i] == np.max(window_highs) and np.sum(window_highs == highs[i]) == 1:
                swing_highs.append((i, float(highs[i])))

            window_lows = lows[i - length : i + length + 1]
            if lows[i] == np.min(window_lows) and np.sum(window_lows == lows[i]) == 1:
                swing_lows.append((i, float(lows[i])))

        return swing_highs, swing_lows

    def detect_bullish_fvgs(self, df: pd.DataFrame, atr: pd.Series) -> List[PointOfInterest]:
        """Détecte les Fair Value Gaps (FVG) haussiers à 3 bougies non comblés."""
        fvgs: List[PointOfInterest] = []
        highs = df["high"].to_numpy()
        lows = df["low"].to_numpy()
        opens = df["open"].to_numpy()
        closes = df["close"].to_numpy()
        atr_vals = atr.to_numpy()

        for i in range(2, len(df)):
            gap_bottom = float(highs[i - 2])
            gap_top = float(lows[i])
            gap_size = gap_top - gap_bottom

            # Bougie centrale (i-1) haussière à fort corps (Displacement) + écart significatif
            mid_range = highs[i - 1] - lows[i - 1]
            mid_body = closes[i - 1] - opens[i - 1]
            if (
                gap_size > 0
                and mid_range > 0
                and (mid_body / mid_range) >= self.config.displacement_body_ratio
                and gap_size >= self.config.min_fvg_atr_ratio * atr_vals[i - 1]
            ):
                structural_low = float(min(lows[i - 2], lows[i - 1]))
                poi = PointOfInterest(
                    kind="FVG_BULLISH",
                    created_at_idx=i,
                    top=gap_top,
                    bottom=gap_bottom,
                    structural_low=structural_low,
                )
                # Vérifier si le FVG a été totalement traversé après sa création
                if i + 1 < len(df) - 1:
                    subsequent_lows = lows[i + 1 : -1]
                    if len(subsequent_lows) > 0 and np.min(subsequent_lows) < gap_bottom:
                        poi.mitigated = True
                fvgs.append(poi)

        return [f for f in fvgs if not f.mitigated]

    def detect_bullish_order_blocks(
        self,
        df: pd.DataFrame,
        swing_highs: List[Tuple[int, float]],
        swing_lows: List[Tuple[int, float]],
        atr: pd.Series,
    ) -> Tuple[List[PointOfInterest], str, bool]:
        """Détecte les cassures haussières (BOS / CHoCH), les Sweeps SSL et l'Order Block associé."""
        if len(swing_highs) < 2 or len(swing_lows) < 2:
            return [], "NONE", False

        opens = df["open"].to_numpy()
        closes = df["close"].to_numpy()
        highs = df["high"].to_numpy()
        lows = df["low"].to_numpy()
        atr_vals = atr.to_numpy()

        prev_sl_idx, prev_sl_price = swing_lows[-2]
        last_sl_idx, last_sl_price = swing_lows[-1]

        # Vérifier s'il y a eu une prise de liquidité (Liquidity Sweep SSL) sous le creux précédent
        liquidity_swept = last_sl_price < prev_sl_price

        # Identifier le dernier Swing High formé AVANT ou PENDANT la jambe de retournement
        candidate_highs = [sh for sh in swing_highs if sh[0] < last_sl_idx] or [swing_highs[-2]]
        broken_sh_idx, broken_sh_price = candidate_highs[-1]

        # Chercher une cassure franche (clôture au-dessus du Swing High) après le dernier Swing Low
        bos_idx: Optional[int] = None
        for idx in range(last_sl_idx + 1, len(df)):
            candle_range = highs[idx] - lows[idx]
            candle_body = closes[idx] - opens[idx]
            if (
                closes[idx] > broken_sh_price
                and candle_range > 0
                and (candle_body / candle_range) >= self.config.displacement_body_ratio
            ):
                bos_idx = idx
                break

        if bos_idx is None:
            return [], "NONE", liquidity_swept

        structure_type = "CHoCH_BULLISH" if liquidity_swept else "BOS_BULLISH"

        # Isoler la dernière bougie baissière autour du creux ayant initié l'impulsion
        ob_idx: Optional[int] = None
        search_start = max(0, last_sl_idx - 2)
        for j in range(bos_idx - 1, search_start - 1, -1):
            if closes[j] < opens[j]:
                ob_idx = j
                break

        if ob_idx is None:
            ob_idx = last_sl_idx

        ob_top = float(max(opens[ob_idx], closes[ob_idx]))
        ob_bottom = float(lows[ob_idx])
        structural_low = float(min(ob_bottom, last_sl_price))

        # Vérifier que l'Order Block n'a pas été invalidé avant la bougie courante
        if bos_idx + 1 < len(df) - 1:
            if np.min(lows[bos_idx + 1 : -1]) < structural_low - 0.1 * atr_vals[bos_idx]:
                return [], structure_type, liquidity_swept

        ob = PointOfInterest(
            kind="OB_BULLISH",
            created_at_idx=ob_idx,
            top=ob_top,
            bottom=ob_bottom,
            structural_low=structural_low,
        )
        return [ob], structure_type, liquidity_swept

    def calculate_spot_position_size(
        self,
        equity_usd: float,
        entry_price: float,
        stop_loss: float,
    ) -> Tuple[float, float, float, float]:
        """Calcule la taille de position Spot en respectant le plafond de 20 % d'allocation.

        Retourne : (position_size_usd, allocation_pct, effective_risk_pct, sl_distance_pct)
        """
        sl_distance_pct = ((entry_price - stop_loss) / entry_price) * 100.0
        if sl_distance_pct <= 0:
            return 0.0, 0.0, 0.0, 0.0

        # Taille idéale pour risquer target_risk_pct du portefeuille
        target_risk_usd = equity_usd * (self.config.target_risk_pct / 100.0)
        ideal_position_usd = target_risk_usd / (sl_distance_pct / 100.0)

        # Plafond d'allocation Spot par position (ex: 20 % de l'équité)
        max_position_usd = equity_usd * (self.config.max_allocation_pct / 100.0)
        final_position_usd = min(ideal_position_usd, max_position_usd)

        allocation_pct = (final_position_usd / equity_usd) * 100.0
        effective_risk_pct = allocation_pct * (sl_distance_pct / 100.0)
        return (
            round(final_position_usd, 2),
            round(allocation_pct, 2),
            round(effective_risk_pct, 3),
            round(sl_distance_pct, 3),
        )

    def evaluate_pair(
        self,
        symbol: str,
        df: pd.DataFrame,
        equity_usd: float,
        open_positions_count: int = 0,
        daily_pnl_pct: float = 0.0,
    ) -> Optional[SMCSignal]:
        """Évalue une paire sur ses bougies OHLCV et retourne un signal d'achat SMC valide."""
        # 1. Vérification du Circuit Breaker journalier et du plafond de positions
        if daily_pnl_pct <= -abs(self.config.daily_circuit_breaker_pct):
            return None
        if open_positions_count >= self.config.max_positions:
            return None

        current_idx = len(df) - 1
        # 2. Vérification du délai de repos R5
        if symbol in self.last_exit_candle_idx:
            candles_since_exit = current_idx - self.last_exit_candle_idx[symbol]
            if candles_since_exit < self.config.cooldown_candles:
                return None

        atr = self.compute_atr(df, self.config.atr_period)
        swing_highs, swing_lows = self.detect_swings(df)
        if len(swing_highs) < 2 or len(swing_lows) < 2:
            return None

        # 3. Calcul du Dealing Range et filtre Discount (< 50 %)
        range_high = max(price for _, price in swing_highs[-2:])
        range_low = min(price for _, price in swing_lows[-2:])
        if range_high <= range_low:
            return None

        current_close = float(df["close"].iloc[-1])
        current_low = float(df["low"].iloc[-1])
        current_atr = float(atr.iloc[-1])
        dealing_range_pct = ((current_close - range_low) / (range_high - range_low)) * 100.0

        if self.config.require_discount_zone and dealing_range_pct > 50.0:
            return None

        # 4. Détection de la cassure de structure (CHoCH/BOS) et des zones POI (OB + FVG)
        obs, structure_type, swept = self.detect_bullish_order_blocks(df, swing_highs, swing_lows, atr)
        fvgs = self.detect_bullish_fvgs(df, atr)
        if structure_type == "NONE" and not fvgs:
            return None

        candidates = obs + fvgs
        if not candidates:
            return None

        # Chercher une zone POI dans laquelle la bougie actuelle vient puiser (mitigation / retour)
        active_poi: Optional[PointOfInterest] = None
        for poi in reversed(candidates):
            if poi.bottom <= current_low <= poi.top or poi.bottom <= current_close <= poi.top:
                active_poi = poi
                break

        if active_poi is None:
            return None

        # 5. Calcul du Stop-Loss structurel (S5) et du Take-Profit
        entry_price = current_close
        stop_loss = active_poi.structural_low - (self.config.sl_atr_buffer * current_atr)
        sl_distance_pct = ((entry_price - stop_loss) / entry_price) * 100.0

        if not (self.config.min_sl_distance_pct <= sl_distance_pct <= self.config.max_sl_distance_pct):
            return None

        # Cible de Take-Profit : liquidité externe (range_high) ou multiple de R
        min_tp_price = entry_price + (entry_price - stop_loss) * self.config.rr_ratio
        take_profit = max(range_high, min_tp_price)
        tp_distance_pct = ((take_profit - entry_price) / entry_price) * 100.0
        actual_rr = tp_distance_pct / sl_distance_pct

        # 6. Dimensionnement dynamique de la position Spot
        pos_usd, alloc_pct, eff_risk_pct, _ = self.calculate_spot_position_size(
            equity_usd=equity_usd,
            entry_price=entry_price,
            stop_loss=stop_loss,
        )
        if pos_usd <= 0:
            return None

        return SMCSignal(
            symbol=symbol,
            signal_type=f"{structure_type}+{active_poi.kind}",
            entry_price=round(entry_price, 4),
            stop_loss=round(stop_loss, 4),
            take_profit=round(take_profit, 4),
            sl_distance_pct=round(sl_distance_pct, 2),
            tp_distance_pct=round(tp_distance_pct, 2),
            rr_ratio=round(actual_rr, 2),
            position_size_usd=pos_usd,
            allocation_pct=alloc_pct,
            effective_risk_pct=eff_risk_pct,
            dealing_range_pct=round(dealing_range_pct, 1),
            notes=(
                f"Sweep SSL: {'Oui' if swept else 'Non'} | "
                f"Zone: {dealing_range_pct:.1f}% (Discount) | "
                f"SL structurel sous {active_poi.structural_low:.2f} (-{self.config.sl_atr_buffer} ATR)"
            ),
        )


def _run_demo_simulation() -> None:
    """Exécute un test de validation déterministe du filtre d'univers et du moteur SMC."""
    config = RiskAndUniverseConfig()
    engine = SMCStrategyEngine(config)

    # 1. Test du filtrage de l'univers multi-paires (U1-U6)
    sample_pairs = [
        PairMetadata("BTCUSDT", "BTC", "USDT", 850_000_000, 68400.0, 68405.0, False),
        PairMetadata("SOLUSDT", "SOL", "USDT", 320_000_000, 175.20, 175.25, False),
        PairMetadata("SOLBTC", "SOL", "BTC", 25_000_000, 0.00256, 0.002561, False),      # Exclu: devise BTC
        PairMetadata("BTCUPUSDT", "BTCUP", "USDT", 40_000_000, 12.50, 12.51, False),     # Exclu: jeton levier
        PairMetadata("USDCUSDT", "USDC", "USDT", 400_000_000, 0.9999, 1.0000, False),    # Exclu: stable/stable
        PairMetadata("LOWLIQUSDT", "LOWLIQ", "USDT", 4_200_000, 1.20, 1.201, False),     # Exclu: volume < 15M$
    ]
    valid_universe = filter_spot_universe(sample_pairs, config)
    print(f"Paires retenues après filtrage U1-U6 : {[p.symbol for p in valid_universe]}")

    # 2. Génération d'une séquence OHLCV illustrant un Liquidity Sweep + CHoCH + retour sur Order Block
    rows = []
    prices = [
        # (open, high, low, close)
        (102.0, 103.0, 101.0, 102.5),
        (102.5, 104.0, 102.0, 103.5),
        (103.5, 106.0, 103.0, 105.5),  # Swing High initial (106.0)
        (105.5, 105.6, 103.0, 103.2),
        (103.2, 103.8, 101.5, 102.0),
        (102.0, 102.5, 100.0, 100.5),  # Swing Low 1 (100.0)
        (100.5, 102.2, 100.2, 101.8),
        (101.8, 103.5, 101.5, 103.0),
        (103.0, 104.5, 102.8, 104.0),  # Swing High intermédiaire (104.5)
        (104.0, 104.1, 102.0, 102.2),
        (102.2, 102.5, 100.8, 101.0),
        (101.0, 101.2, 98.8, 99.4),    # Liquidity Sweep sous 100.0 (98.8) + Bougie baissière (Order Block)
        (99.4, 102.8, 99.3, 102.6),    # Impulsion haussière (Displacement) + création de FVG
        (102.6, 105.8, 102.4, 105.4),  # Cassure franche au-dessus de 104.5 (CHoCH haussier)
        (105.4, 106.5, 104.8, 105.9),
        (105.9, 106.0, 103.5, 103.8),
        (103.8, 104.0, 101.8, 102.1),
        (102.1, 102.2, 100.5, 100.9),  # Retour en zone Discount (< 50%) dans le FVG / Order Block
    ]
    prefix = [(101.5, 102.2, 100.8, 101.8)] * 10
    for o, h, l, c in prefix + prices:
        rows.append({"open": o, "high": h, "low": l, "close": c, "volume": 15000.0})

    df_sample = pd.DataFrame(rows)
    engine.config.swing_length = 2
    signal = engine.evaluate_pair("SOLUSDT", df_sample, equity_usd=10_000.0)
    if signal:
        print("Signal SMC généré avec succès :", signal)


if __name__ == "__main__":
    _run_demo_simulation()