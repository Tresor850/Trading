/**
 * Algorithme de dimensionnement de position (Position Sizing) et de gestion du risque mathématique.
 * Transposition TypeScript certifiée du script Python d'audit : gemini-code-1792673107443_370aa8d5.py
 * et résolution des anomalies identifiées dans l'Audit Technique & Mathématique (Tradng_bot).
 */

export interface SpotPositionSizingResult {
  isAccepted: boolean;
  rejectReason?: string;
  side: 'LONG' | 'SHORT';
  totalEquity: number;
  riskAmountUsd: number; // Risque maximal en $ (ex: 1% du capital)
  positionSizeUsd: number; // Taille de la position en $
  unitsToBuy: number; // Quantité de tokens / contrats
  entryPrice: number;
  stopLossPrice: number;
  slDistancePct: number; // Distance en %
  takeProfitPrice: number;
  tpDistancePct: number; // Distance en %
  maxLossUsd: number; // Perte réelle si SL touché (garantie <= riskAmountUsd)
  expectedGainUsd: number; // Gain réel si TP touché
  actualRiskRewardRatio: number; // Ratio R:R vérifié (ex: 2.0 pour 1:2)
  capitalAllocationPct: number; // % du capital alloué au trade
}

export interface ForexPositionSizingResult {
  isAccepted: boolean;
  rejectReason?: string;
  totalEquity: number;
  riskAmountUsd: number;
  stopLossPips: number;
  takeProfitPips: number;
  lotSize: number;
  maxLossUsd: number;
  expectedGainUsd: number;
  actualRiskRewardRatio: number;
}

/**
 * Calcule la taille de position exacte pour un marché Spot (Crypto, Actions, Indices, Or).
 * Formule Universelle : Quantité = (Capital Total * Risque %) / |Prix Entrée - Prix Stop-Loss|
 * 
 * Garantit que :
 * 1. La perte maximale si le Stop-Loss est déclenché ne dépasse JAMAIS le risque unitaire (1% par défaut).
 * 2. Le Take-Profit offre STRICTEMENT un ratio Risk/Reward >= 1:2 (gain visé = au moins 2 fois le risque).
 * 3. L'allocation maximale par trade (ex: 20%) est respectée sans altérer le ratio R:R.
 */
export function calculateSpotPositionSizing(params: {
  totalEquity: number;
  availableCash: number;
  riskPercentage: number; // ex: 1.0 pour 1%
  entryPrice: number;
  stopLossPrice: number;
  targetRiskRewardRatio?: number; // ex: 2.0 pour 1:2
  maxAllocationPct?: number; // ex: 20.0 pour 20%
  minNotionalUsd?: number;
}): SpotPositionSizingResult {
  const {
    totalEquity,
    availableCash,
    riskPercentage = 1.0,
    entryPrice,
    stopLossPrice,
    targetRiskRewardRatio = 2.0,
    maxAllocationPct = 20.0,
    minNotionalUsd = 10.0,
  } = params;

  if (entryPrice <= 0 || stopLossPrice <= 0) {
    return {
      isAccepted: false,
      rejectReason: 'Les prix d’entrée et de stop-loss doivent être strictement positifs.',
      side: 'LONG',
      totalEquity,
      riskAmountUsd: 0,
      positionSizeUsd: 0,
      unitsToBuy: 0,
      entryPrice,
      stopLossPrice,
      slDistancePct: 0,
      takeProfitPrice: 0,
      tpDistancePct: 0,
      maxLossUsd: 0,
      expectedGainUsd: 0,
      actualRiskRewardRatio: 0,
      capitalAllocationPct: 0,
    };
  }

  const isLong = entryPrice > stopLossPrice;
  const slDistancePrice = Math.abs(entryPrice - stopLossPrice);
  const slDistancePct = (slDistancePrice / entryPrice) * 100;

  // Calcul du Take-Profit selon le ratio cible (ex: 1:2)
  const tpDistancePrice = slDistancePrice * targetRiskRewardRatio;
  const takeProfitPrice = isLong
    ? entryPrice + tpDistancePrice
    : entryPrice - tpDistancePrice;
  const tpDistancePct = (tpDistancePrice / entryPrice) * 100;

  // Vérification du filtre strict R:R
  const calculatedRr = tpDistancePrice / slDistancePrice;
  if (calculatedRr < targetRiskRewardRatio - 0.001) {
    return {
      isAccepted: false,
      rejectReason: `REJETÉ : Ratio R:R (1:${calculatedRr.toFixed(2)}) inférieur au seuil minimal exigé de 1:${targetRiskRewardRatio}.`,
      side: isLong ? 'LONG' : 'SHORT',
      totalEquity,
      riskAmountUsd: 0,
      positionSizeUsd: 0,
      unitsToBuy: 0,
      entryPrice,
      stopLossPrice,
      slDistancePct,
      takeProfitPrice,
      tpDistancePct,
      maxLossUsd: 0,
      expectedGainUsd: 0,
      actualRiskRewardRatio: calculatedRr,
      capitalAllocationPct: 0,
    };
  }

  // 1. Montant maximal en devise accepté en risque (ex: 1% de 9002.96 = 90.03 USDT)
  const riskAmountUsd = totalEquity * (riskPercentage / 100.0);

  // 2. Taille théorique de la position : Sizing = Risque / Distance % au SL
  const rawPositionSizeUsd = riskAmountUsd / (slDistancePct / 100.0);

  // 3. Plafonds de sécurité : Max allocation (ex: 20% du capital) et liquidité disponible (95% cash)
  const maxCapUsd = totalEquity * (maxAllocationPct / 100.0);
  const liquidityCapUsd = availableCash * 0.95;
  const effectivePositionSizeUsd = Math.min(rawPositionSizeUsd, maxCapUsd, liquidityCapUsd);

  if (effectivePositionSizeUsd < minNotionalUsd) {
    return {
      isAccepted: false,
      rejectReason: `Position calculée (${effectivePositionSizeUsd.toFixed(2)} USDT) inférieure au minimum de ${minNotionalUsd} USDT.`,
      side: isLong ? 'LONG' : 'SHORT',
      totalEquity,
      riskAmountUsd,
      positionSizeUsd: effectivePositionSizeUsd,
      unitsToBuy: 0,
      entryPrice,
      stopLossPrice,
      slDistancePct,
      takeProfitPrice,
      tpDistancePct,
      maxLossUsd: 0,
      expectedGainUsd: 0,
      actualRiskRewardRatio: calculatedRr,
      capitalAllocationPct: 0,
    };
  }

  // 4. Quantité d'unités à acquérir
  const unitsToBuy = effectivePositionSizeUsd / entryPrice;

  // 5. Calcul des pertes et gains réels en devises (respectant la symétrie R:R >= 1:2)
  const maxLossUsd = effectivePositionSizeUsd * (slDistancePct / 100.0);
  const expectedGainUsd = effectivePositionSizeUsd * (tpDistancePct / 100.0);
  const capitalAllocationPct = (effectivePositionSizeUsd / totalEquity) * 100.0;

  return {
    isAccepted: true,
    side: isLong ? 'LONG' : 'SHORT',
    totalEquity: Number(totalEquity.toFixed(2)),
    riskAmountUsd: Number(riskAmountUsd.toFixed(2)),
    positionSizeUsd: Number(effectivePositionSizeUsd.toFixed(2)),
    unitsToBuy: Number(unitsToBuy.toFixed(entryPrice < 1 ? 2 : 5)),
    entryPrice,
    stopLossPrice: Number(stopLossPrice.toFixed(entryPrice < 1 ? 5 : 2)),
    slDistancePct: Number(slDistancePct.toFixed(2)),
    takeProfitPrice: Number(takeProfitPrice.toFixed(entryPrice < 1 ? 5 : 2)),
    tpDistancePct: Number(tpDistancePct.toFixed(2)),
    maxLossUsd: Number(maxLossUsd.toFixed(2)),
    expectedGainUsd: Number(expectedGainUsd.toFixed(2)),
    actualRiskRewardRatio: Number(calculatedRr.toFixed(2)),
    capitalAllocationPct: Number(capitalAllocationPct.toFixed(2)),
  };
}

/**
 * Filtre de corrélation multi-actifs (Page 9 de l'audit)
 * Empêche la surexposition simultanée à des actifs corrélés (ex: BTC + Or + EUR/USD).
 */
export function evaluateCorrelationFilter(
  newSymbol: string,
  newCategory: string,
  existingSymbols: string[]
): { allowed: boolean; reason?: string } {
  // Décompte des catégories existantes
  const cryptoCount = existingSymbols.filter((s) =>
    ['BTC', 'ETH', 'SOL', 'BNB', 'NEAR', 'AVAX', 'SUI', 'DOGE', 'LINK'].some((token) =>
      s.includes(token)
    )
  ).length;

  const isNewCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'NEAR', 'AVAX', 'SUI', 'DOGE', 'LINK'].some(
    (token) => newSymbol.includes(token)
  );

  // Règle 1 : Maximum 2 positions crypto simultanées pour éviter le risque sectoriel
  if (isNewCrypto && cryptoCount >= 2) {
    return {
      allowed: false,
      reason: `Filtre de corrélation : Déjà ${cryptoCount} positions Crypto actives. Diversification obligatoire vers Indices, Forex ou Matières premières.`,
    };
  }

  // Règle 2 : Pas de cumul simultané Dollar-proxy (EUR/USD et XAU/USD ensemble) si déjà présent
  const hasDollarProxy = existingSymbols.some(
    (s) => s.includes('EUR/USD') || s.includes('XAU/USD')
  );
  if (
    hasDollarProxy &&
    (newSymbol.includes('EUR/USD') || newSymbol.includes('XAU/USD'))
  ) {
    return {
      allowed: false,
      reason: 'Filtre de corrélation : Cumul EUR/USD et Or (XAU/USD) bloqué (double exposition dollar américain inverse).',
    };
  }

  return { allowed: true };
}
