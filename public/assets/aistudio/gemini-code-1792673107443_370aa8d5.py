"""
Module de calcul du dimensionnement de position (Position Sizing)
et de gestion du risque pour Tradng_bot.
"""

def calculate_spot_crypto_position(total_equity: float, risk_percentage: float, 
                                    entry_price: float, stop_loss_price: float, 
                                    target_rr: float = 2.0) -> dict:
    """
    Calcule la taille de position pour un marché Spot (crypto/actions).
    
    :param total_equity: Capital total du compte (ex: 9002.96 USDT)
    :param risk_percentage: Pourcentage de capital risqué par trade (ex: 1.0 pour 1%)
    :param entry_price: Prix d'entrée prévu
    :param stop_loss_price: Niveau technique d'invalidation (Stop Loss)
    :param target_rr: Ratio Risk/Reward minimum ciblé (ex: 2.0 pour 1:2)
    """
    if entry_price <= 0 or stop_loss_price <= 0:
        raise ValueError("Les prix doivent être strictement positifs.")
    
    is_long = entry_price > stop_loss_price
    
    # Montant maximal en devise que l'on accepte de perdre sur ce trade
    risk_amount = total_equity * (risk_percentage / 100.0)
    
    # Distance au Stop Loss en pourcentage
    sl_distance_pct = abs(entry_price - stop_loss_price) / entry_price
    
    # Taille totale de la position requise pour ne pas dépasser le risque
    position_size_usd = risk_amount / sl_distance_pct
    units_to_buy = position_size_usd / entry_price
    
    # Calcul du Take Profit pour respecter le Risk/Reward réel
    if is_long:
        tp_price = entry_price + (entry_price - stop_loss_price) * target_rr
        tp_distance_pct = (tp_price - entry_price) / entry_price
    else:
        tp_price = entry_price - (stop_loss_price - entry_price) * target_rr
        tp_distance_pct = (entry_price - tp_price) / entry_price
        
    expected_gain = risk_amount * target_rr

    return {
        "sens": "ACHAT (LONG)" if is_long else "VENTE (SHORT)",
        "capital_total": round(total_equity, 2),
        "risque_max_autorise": round(risk_amount, 2),
        "taille_position_usd": round(position_size_usd, 2),
        "pourcentage_allocation_capital": round((position_size_usd / total_equity) * 100, 2),
        "quantite_unites": round(units_to_buy, 6),
        "prix_entree": entry_price,
        "stop_loss": stop_loss_price,
        "sl_distance_pourcent": round(sl_distance_pct * 100, 2),
        "take_profit_cible": round(tp_price, 5),
        "tp_distance_pourcent": round(tp_distance_pct * 100, 2),
        "gain_theorique_vise": round(expected_gain, 2),
        "ratio_rr_verifie": f"1:{target_rr}"
    }


def calculate_forex_lot_size(total_equity: float, risk_percentage: float, 
                             stop_loss_pips: float, pip_value_standard_lot: float = 10.0, 
                             target_rr: float = 2.0) -> dict:
    """
    Calcule la taille de lot exacte pour une paire Forex majeure (ex: EUR/USD).
    
    :param total_equity: Capital total du compte
    :param risk_percentage: Pourcentage de capital risqué par trade (ex: 1.0)
    :param stop_loss_pips: Distance au SL en pips
    :param pip_value_standard_lot: Valeur d'1 pip pour 1 lot standard (10$ en moyenne)
    :param target_rr: Ratio R:R (ex: 2.0)
    """
    if stop_loss_pips <= 0:
        raise ValueError("La distance en pips doit être supérieure à 0.")
        
    risk_amount = total_equity * (risk_percentage / 100.0)
    
    # Lots à ouvrir = Risque / (Pips x Valeur d'1 pip par lot)
    lot_size = risk_amount / (stop_loss_pips * pip_value_standard_lot)
    
    return {
        "risque_max_autorise": round(risk_amount, 2),
        "sl_pips": stop_loss_pips,
        "tp_pips_vise": round(stop_loss_pips * target_rr, 1),
        "taille_en_lots": round(lot_size, 2),
        "gain_theorique_vise": round(risk_amount * target_rr, 2),
        "ratio_rr": f"1:{target_rr}"
    }


# =====================================================================
# Démonstration basée sur les chiffres du bot (9 002,96 USDT)
# =====================================================================
if __name__ == "__main__":
    current_equity = 9002.96  # Équité totale affichée sur le dashboard
    
    print("--- 1. CALCUL POUR BITCOIN (SPOT) ---")
    btc_trade = calculate_spot_crypto_position(
        total_equity=current_equity,
        risk_percentage=1.0,     # Risque strict de 1% (90.03 USDT)
        entry_price=65000.0,
        stop_loss_price=64025.0, # Stop Loss placé à 1.5% sous l'entrée
        target_rr=2.0            # Vise un ratio réel de 1:2
    )
    for k, v in btc_trade.items():
        print(f"  {k}: {v}")

    print("\n--- 2. CALCUL POUR EUR/USD (FOREX) ---")
    forex_trade = calculate_forex_lot_size(
        total_equity=current_equity,
        risk_percentage=1.0,     # Risque strict de 1%
        stop_loss_pips=25.0,     # Stop Loss technique de 25 pips
        pip_value_standard_lot=10.0,
        target_rr=2.0
    )
    for k, v in forex_trade.items():
        print(f"  {k}: {v}")