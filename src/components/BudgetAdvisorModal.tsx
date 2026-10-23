import React, { useState, useMemo } from 'react';
import { MarketPair, PortfolioRiskConfig } from '../types/trading';
import {
  Coins,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Sliders,
  DollarSign,
  ChevronRight,
  Sparkles,
  BarChart3,
  Calendar,
  X,
} from 'lucide-react';

interface BudgetAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  riskConfig: PortfolioRiskConfig;
  pairs: MarketPair[];
  onApplyBudget: (budget: number, currency: 'EUR' | 'USD' | 'USDT') => void;
  lang: 'fr' | 'en';
}

export const BudgetAdvisorModal: React.FC<BudgetAdvisorModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  riskConfig,
  pairs,
  onApplyBudget,
  lang,
}) => {
  if (!isOpen) return null;
  const isFrench = lang === 'fr';

  // State
  const [budgetInput, setBudgetInput] = useState<number>(
    currentBalance > 0 ? currentBalance : 1000
  );
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'USD' | 'USDT'>('EUR');
  const [horizonMonths, setHorizonMonths] = useState<number>(3); // 1, 3, 6, 12 months
  const [riskProfile, setRiskProfile] = useState<'prudent' | 'standard' | 'dynamic'>('standard');
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Currency symbol
  const currencySymbol = selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : '₮';

  // Risk profile multipliers
  const profileSettings = useMemo(() => {
    switch (riskProfile) {
      case 'prudent':
        return {
          riskPerTradePct: 1.0,
          stopLossPct: 1.2,
          takeProfitRatio: 2.0,
          takeProfitPct: 2.4,
          monthlyReturnEstPct: 3.8,
          favorableMonthlyPct: 6.2,
          conservativeMonthlyPct: 0.8,
          label: isFrench ? 'Prudent (Préservation)' : 'Prudent (Preservation)',
        };
      case 'dynamic':
        return {
          riskPerTradePct: 3.0,
          stopLossPct: 2.0,
          takeProfitRatio: 2.0,
          takeProfitPct: 4.0,
          monthlyReturnEstPct: 8.5,
          favorableMonthlyPct: 14.0,
          conservativeMonthlyPct: -1.5,
          label: isFrench ? 'Dynamique (Croissance)' : 'Dynamic (Growth)',
        };
      case 'standard':
      default:
        return {
          riskPerTradePct: riskConfig.riskPerTradePct || 2.0,
          stopLossPct: riskConfig.stopLossPct || 1.5,
          takeProfitRatio: riskConfig.takeProfitRatio || 2.0,
          takeProfitPct: (riskConfig.stopLossPct || 1.5) * (riskConfig.takeProfitRatio || 2.0),
          monthlyReturnEstPct: 5.6,
          favorableMonthlyPct: 9.8,
          conservativeMonthlyPct: 0.2,
          label: isFrench ? 'Standard (Recommandé v1.0)' : 'Standard (Recommended v1.0)',
        };
    }
  }, [riskProfile, riskConfig, isFrench]);

  // Sizing calculations according to cahier des charges section 5.3
  const maxAllocationPct = riskConfig.maxAllocationPerPositionPct || 20; // 20%
  const maxSimultaneousPositions = riskConfig.maxSimultaneousPositions || 5;

  const maxPositionSize = Number(((budgetInput * maxAllocationPct) / 100).toFixed(2));
  // Risque en devises sur le trade selon la distance au Stop-Loss (ex: 1.5% de l'allocation)
  const maxLossPerTrade = Number(((maxPositionSize * profileSettings.stopLossPct) / 100).toFixed(2));
  // Gain visé en devises respectant strictement le ratio 1:2 (Gain = 2 x Perte)
  const targetGainPerTrade = Number((maxLossPerTrade * profileSettings.takeProfitRatio).toFixed(2));
  // Plafond de risque global de capital (ex: 1% du compte)
  const accountRiskCap = Number(((budgetInput * profileSettings.riskPerTradePct) / 100).toFixed(2));
  const effectiveRiskAmount = Math.min(accountRiskCap, maxLossPerTrade);
  const dailyCircuitBreakerAmount = Number(
    ((budgetInput * (riskConfig.dailyLossCircuitBreakerPct || 5)) / 100).toFixed(2)
  );
  const estimatedFeePerTrade = Number((maxPositionSize * 0.001).toFixed(2)); // 0.10%

  // Projections
  const realisticFinal = Number(
    (budgetInput * Math.pow(1 + profileSettings.monthlyReturnEstPct / 100, horizonMonths)).toFixed(2)
  );
  const realisticGain = Number((realisticFinal - budgetInput).toFixed(2));
  const realisticGainPct = Number(((realisticGain / budgetInput) * 100).toFixed(1));

  const favorableFinal = Number(
    (budgetInput * Math.pow(1 + profileSettings.favorableMonthlyPct / 100, horizonMonths)).toFixed(2)
  );
  const conservativeFinal = Number(
    (
      budgetInput * Math.pow(1 + profileSettings.conservativeMonthlyPct / 100, horizonMonths)
    ).toFixed(2)
  );

  // Month-by-month curve data for projection visualization
  const monthlySteps = useMemo(() => {
    const steps = [];
    let current = budgetInput;
    for (let m = 0; m <= horizonMonths; m++) {
      if (m === 0) {
        steps.push({ month: 'Départ', value: budgetInput });
      } else {
        current = current * (1 + profileSettings.monthlyReturnEstPct / 100);
        steps.push({ month: `Mois ${m}`, value: Number(current.toFixed(2)) });
      }
    }
    return steps;
  }, [budgetInput, horizonMonths, profileSettings.monthlyReturnEstPct]);

  // Recommended pairs matching the currency
  const recommendedPairs = useMemo(() => {
    let filtered = pairs.filter((p) => {
      if (selectedCurrency === 'EUR') {
        return (
          p.quoteAsset === 'EUR' ||
          p.symbol === 'CAC40/EUR' ||
          p.symbol === 'USD/EUR' ||
          p.symbol === 'DAX40/EUR' ||
          p.symbol === 'MC/EUR' ||
          p.symbol === 'AIR/EUR'
        );
      } else if (selectedCurrency === 'USD') {
        return (
          p.quoteAsset === 'USD' ||
          p.symbol === 'EUR/USD' ||
          p.symbol === 'SPX/USD' ||
          p.symbol === 'XAU/USD' ||
          p.symbol === 'NDX/USD' ||
          p.symbol === 'AAPL/USD'
        );
      } else {
        return (
          p.quoteAsset === 'USDT' ||
          p.symbol === 'BTC/USDT' ||
          p.symbol === 'ETH/USDT' ||
          p.symbol === 'SOL/USDT' ||
          p.symbol === 'BNB/USDT'
        );
      }
    });

    if (filtered.length === 0) filtered = pairs.slice(0, 4);
    return filtered.slice(0, 4);
  }, [pairs, selectedCurrency]);

  // Tailored advice messages based on budget amount and currency
  const tailoredAdvice = useMemo(() => {
    const adviceList: Array<{ title: string; text: string; icon: 'check' | 'warn' | 'info' }> = [];

    // Currency advice
    if (selectedCurrency === 'EUR') {
      adviceList.push({
        title: 'Optimisation Devise EUR & Marchés Européens',
        text: 'En déposant des Euros (SEPA gratuit sur Binance), vous tradez directement le CAC 40, USD/EUR et les actions européennes sans subir de frais de change ou de conversion de devises.',
        icon: 'check',
      });
    } else if (selectedCurrency === 'USD') {
      adviceList.push({
        title: 'Excellente liquidité sur le Forex EUR/USD et Marchés US',
        text: 'Le Dollar américain offre les spreads les plus resserrés du marché mondial sur EUR/USD (0.008%) et une couverture parfaite sur l’Or Spot (XAU/USD) et le S&P 500.',
        icon: 'check',
      });
    } else {
      adviceList.push({
        title: 'Accès Universel à l’écosystème Binance Crypto Spot',
        text: 'L’USDT vous donne accès à plus de 350 paires spot crypto avec la plus grande profondeur de carnet d’ordres au monde.',
        icon: 'check',
      });
    }

    // Budget sizing advice
    if (budgetInput < 300) {
      adviceList.push({
        title: 'Recommandation Petit Budget (< 300 €)',
        text: `Avec ${budgetInput} ${currencySymbol}, chaque position sera de ${maxPositionSize} ${currencySymbol}. C’est au-dessus du minimum de 10 € imposé par Binance. Il est conseillé de ne pas dépasser 2 à 3 positions simultanées pour ne pas diluer votre capital.`,
        icon: 'info',
      });
    } else if (budgetInput >= 300 && budgetInput <= 5000) {
      adviceList.push({
        title: 'Budget Idéal pour la stratégie Bot Multi-Paires v1.0',
        text: `Avec ${budgetInput} ${currencySymbol}, l’allocation à 20% (${maxPositionSize} ${currencySymbol} par trade) est parfaitement calibrée : elle permet de profiter des 5 places disponibles tout en respectant la règle des 2% de risque maximal.`,
        icon: 'check',
      });
    } else {
      adviceList.push({
        title: 'Conseil Grand Compte (> 5 000 €)',
        text: `Pour un capital de ${budgetInput.toLocaleString()} ${currencySymbol}, le profil Prudent (1% à 1.5% de risque par trade) est recommandé pour lisser les variations tout en générant un profit monétaire très significatif avec un drawdown minimal.`,
        icon: 'check',
      });
    }

    // Risk rule advice
    adviceList.push({
      title: 'Discipline de Sortie & Garde-Fou',
      text: `Chaque ordre ouvert est automatiquement sécurisé par un Stop-Loss posé sur l’exchange à -${profileSettings.stopLossPct}% (${maxLossPerTrade} ${currencySymbol} max de perte). En cas de 3 trades perdants consécutifs, le coupe-circuit protège votre équité.`,
      icon: 'warn',
    });

    return adviceList;
  }, [budgetInput, selectedCurrency, currencySymbol, maxPositionSize, maxLossPerTrade, profileSettings]);

  const handleApply = () => {
    onApplyBudget(budgetInput, selectedCurrency);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 1200);
  };

  const presetBudgets = [250, 500, 1000, 2500, 5000, 10000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-4xl w-full p-5 sm:p-6 text-neutral-100 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-white">
                  {isFrench
                    ? 'SIMULATEUR DE BUDGET, PRÉDICTIONS & CONSEILS'
                    : 'BUDGET SIMULATOR, PREDICTIONS & ADVICE'}
                </h2>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                  {isFrench ? 'Personnalisé' : 'Customized'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {isFrench
                  ? 'Entrez votre capital et votre devise pour calibrer le bot et projeter vos rendements.'
                  : 'Enter your capital and currency to size the bot and project returns.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5 font-mono text-xs">
          {/* 1. Budget Amount */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col justify-between">
            <div>
              <label className="text-neutral-400 block mb-1 font-semibold flex items-center justify-between">
                <span>{isFrench ? 'Votre Budget de Trading :' : 'Your Trading Budget:'}</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {budgetInput.toLocaleString()} {currencySymbol}
                </span>
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="50"
                  max="1000000"
                  step="50"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(Math.max(10, parseFloat(e.target.value) || 0))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white font-bold text-base focus:outline-none focus:border-emerald-500 pr-10"
                />
                <span className="absolute right-3 top-2.5 text-neutral-400 font-bold">
                  {currencySymbol}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {presetBudgets.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBudgetInput(amt)}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      budgetInput === amt
                        ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt} {currencySymbol}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-neutral-500 mt-2 block">
              {isFrench
                ? 'Capital alloué au bot (sécurisé par le coupe-circuit)'
                : 'Bot capital allocation'}
            </span>
          </div>

          {/* 2. Target Currency Selection */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <label className="text-neutral-400 block mb-1.5 font-semibold">
              {isFrench ? 'Devise de Référence :' : 'Base Currency:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedCurrency('EUR')}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedCurrency === 'EUR'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-base font-bold text-emerald-400">€ EUR</div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">CAC 40 / Forex</span>
              </button>

              <button
                onClick={() => setSelectedCurrency('USD')}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedCurrency === 'USD'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-base font-bold text-sky-400">$ USD</div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">EUR/USD / SPX</span>
              </button>

              <button
                onClick={() => setSelectedCurrency('USDT')}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  selectedCurrency === 'USDT'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-base font-bold text-amber-400">₮ USDT</div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">Binance Spot</span>
              </button>
            </div>

            <div className="mt-3 p-2 bg-neutral-900 rounded border border-neutral-800 text-[11px] text-neutral-300">
              {selectedCurrency === 'EUR' && (
                <span className="text-emerald-300">
                  🇫🇷 Optimisé pour <strong>CAC40/EUR</strong>, <strong>USD/EUR</strong> et les actions
                  européennes.
                </span>
              )}
              {selectedCurrency === 'USD' && (
                <span className="text-sky-300">
                  🇺🇸 Optimisé pour <strong>EUR/USD</strong>, <strong>SPX/USD</strong> et l'Or spot.
                </span>
              )}
              {selectedCurrency === 'USDT' && (
                <span className="text-amber-300">
                  🪙 Optimisé pour <strong>BTC/USDT</strong>, <strong>SOL/USDT</strong> et les altcoins.
                </span>
              )}
            </div>
          </div>

          {/* 3. Risk Profile & Horizon */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col justify-between">
            <div>
              <label className="text-neutral-400 block mb-1 font-semibold">
                {isFrench ? 'Profil & Horizon :' : 'Profile & Horizon:'}
              </label>

              {/* Profile buttons */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(['prudent', 'standard', 'dynamic'] as const).map((prof) => (
                  <button
                    key={prof}
                    onClick={() => setRiskProfile(prof)}
                    className={`py-1 px-1.5 rounded text-[10px] border capitalize font-semibold transition-colors ${
                      riskProfile === prof
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {prof === 'prudent' ? 'Prudent' : prof === 'standard' ? 'Standard' : 'Dynamique'}
                  </button>
                ))}
              </div>

              {/* Horizon buttons */}
              <label className="text-[11px] text-neutral-400 block mb-1">
                {isFrench ? 'Horizon de projection :' : 'Projection horizon:'}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { m: 1, label: '1 mois' },
                  { m: 3, label: '3 mois' },
                  { m: 6, label: '6 mois' },
                  { m: 12, label: '1 an' },
                ].map((item) => (
                  <button
                    key={item.m}
                    onClick={() => setHorizonMonths(item.m)}
                    className={`py-1 rounded text-[10px] border text-center transition-colors ${
                      horizonMonths === item.m
                        ? 'bg-neutral-800 border-emerald-600 text-white font-bold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-neutral-400 mt-2">
              Risque : {profileSettings.riskPerTradePct}% | SL : {profileSettings.stopLossPct}% | TP :{' '}
              {profileSettings.takeProfitPct}%
            </div>
          </div>
        </div>

        {/* Section 1: Money Management Breakdown based on User Budget */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 mb-5 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-sm">
                {isFrench
                  ? 'CALCUL DU MONEY MANAGEMENT POUR VOTRE BUDGET'
                  : 'MONEY MANAGEMENT SIZING'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Règles strictes du cahier des charges (Section 5.3)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
            <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Budget Total</span>
              <span className="font-bold text-white text-sm">
                {budgetInput.toLocaleString()} {currencySymbol}
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Capital initial</span>
            </div>

            <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Taille / Position</span>
              <span className="font-bold text-emerald-400 text-sm">
                {maxPositionSize.toLocaleString()} {currencySymbol}
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">20% de l’équité</span>
            </div>

            <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Positions Max</span>
              <span className="font-bold text-sky-400 text-sm">
                {maxSimultaneousPositions} paires
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Simultanées</span>
            </div>

            <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Perte Max / Trade</span>
              <span className="font-bold text-rose-400 text-sm">
                -{maxLossPerTrade} {currencySymbol}
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Stop-Loss à -{profileSettings.stopLossPct}%
              </span>
            </div>

            <div className="p-2.5 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Gain Visé / Trade</span>
              <span className="font-bold text-emerald-400 text-sm">
                +{targetGainPerTrade} {currencySymbol}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5 font-bold">
                Ratio R:R 1 : {profileSettings.takeProfitRatio.toFixed(1)} ✓
              </span>
            </div>

            <div className="p-2.5 bg-neutral-900/80 rounded border border-rose-950/60 bg-rose-950/10">
              <span className="text-rose-400 block text-[10px]">Coupe-Circuit 24h</span>
              <span className="font-bold text-rose-300 text-sm">
                -{dailyCircuitBreakerAmount} {currencySymbol}
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Seuil 5% max / jour</span>
            </div>
          </div>
        </div>

        {/* Section 2: Projections & Prediction Simulation */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-5 mb-5 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-white text-sm">
                  {isFrench
                    ? `PRÉDICTIONS & SIMULATION DU RENDEMENT (${horizonMonths} MOIS)`
                    : `PREDICTIONS & RETURN SIMULATION (${horizonMonths} MONTHS)`}
                </span>
                <span className="text-[11px] text-neutral-400 block">
                  Modélisation basée sur la stratégie EMA 9/21 + RSI 14 (Historique : 58% Win Rate,
                  Ratio 1:2)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-sm bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded">
                +{realisticGainPct}% ({realisticGain >= 0 ? '+' : ''}
                {realisticGain} {currencySymbol})
              </span>
            </div>
          </div>

          {/* Scenarios Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
            {/* Conservative */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
              <span className="text-neutral-400 text-[11px] block">Scénario Prudent / Range</span>
              <div className="text-base font-bold text-neutral-200 mt-1">
                {conservativeFinal.toLocaleString()} {currencySymbol}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Rendement : +{(profileSettings.conservativeMonthlyPct * horizonMonths).toFixed(1)}% |
                Protection maximale
              </span>
            </div>

            {/* Realistic (Baseline) */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-[11px]">
                  Scénario Réaliste (Recommandé)
                </span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded">
                  Probable 70%
                </span>
              </div>
              <div className="text-lg font-bold text-emerald-300 mt-1">
                {realisticFinal.toLocaleString()} {currencySymbol}
              </div>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                Profit estimé : +{realisticGain} {currencySymbol} (+
                {(profileSettings.monthlyReturnEstPct * horizonMonths).toFixed(1)}%)
              </span>
            </div>

            {/* Favorable */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
              <span className="text-neutral-400 text-[11px] block">Scénario Marché Porteur</span>
              <div className="text-base font-bold text-sky-400 mt-1">
                {favorableFinal.toLocaleString()} {currencySymbol}
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Rendement : +{(profileSettings.favorableMonthlyPct * horizonMonths).toFixed(1)}% |
                Tendance forte
              </span>
            </div>
          </div>

          {/* Stepped Projection Progress */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <span className="text-neutral-400 block text-[11px] mb-2 font-semibold">
              Trajectoire prévisionnelle de votre capital mois par mois :
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {monthlySteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-between"
                >
                  <span className="text-neutral-500 text-[10px]">{step.month}</span>
                  <span className="font-bold text-emerald-400 text-xs">
                    {step.value.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Recommended Pairs & Live Calculated Orders for this Currency */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-5 mb-5 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-sm">
                {isFrench
                  ? `PAIRES RECOMMANDÉES POUR VOTRE DEVISE (${selectedCurrency})`
                  : `RECOMMENDED PAIRS FOR ${selectedCurrency}`}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Signaux actuels analysés par l’algorithme
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {recommendedPairs.map((p) => {
              const orderQuantity = Number((maxPositionSize / p.price).toFixed(p.price < 1 ? 2 : 4));
              const slPrice = Number(
                (p.price * (1 - profileSettings.stopLossPct / 100)).toFixed(p.price < 1 ? 5 : 2)
              );
              const tpPrice = Number(
                (p.price * (1 + profileSettings.takeProfitPct / 100)).toFixed(p.price < 1 ? 5 : 2)
              );
              const isSignal = p.activeSignal === 'BUY_SIGNAL';

              return (
                <div
                  key={p.symbol}
                  className={`p-3 rounded-lg border transition-all ${
                    p.symbol.includes('CAC40') || p.symbol.includes('EUR')
                      ? 'bg-emerald-950/20 border-emerald-800/80 shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{p.symbol}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isSignal
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isSignal ? 'SIGNAL ACHAT' : 'SURVEILLANCE'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 block mt-0.5 truncate">{p.name}</span>

                  <div className="mt-2.5 pt-2 border-t border-neutral-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Cours actuel :</span>
                      <span className="text-white font-bold">
                        {p.price.toLocaleString()} {currencySymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Taille suggérée :</span>
                      <span className="text-emerald-400 font-bold">
                        {orderQuantity} ({maxPositionSize} {currencySymbol})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Stop-Loss :</span>
                      <span className="text-rose-400">{slPrice.toLocaleString()} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Take-Profit :</span>
                      <span className="text-emerald-400">{tpPrice.toLocaleString()} {currencySymbol}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Tailored Advice & Guardrails */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-5 mb-5 font-mono text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Info className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-white text-sm">
              {isFrench ? 'CONSEILS & STRATÉGIE ADAPTÉS À VOTRE PROFIL' : 'TAILORED STRATEGY ADVICE'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5">
            {tailoredAdvice.map((adv, idx) => (
              <div
                key={idx}
                className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {adv.icon === 'check' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {adv.icon === 'warn' && (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    {adv.icon === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                    <h4 className="font-bold text-neutral-200 text-xs">{adv.title}</h4>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-[11px]">{adv.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions: 1-Click Apply */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-800 font-mono text-xs">
          <div className="text-neutral-400 text-center sm:text-left text-[11px]">
            {appliedSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Budget de {budgetInput.toLocaleString()} {currencySymbol} appliqué avec succès au Bot !
              </span>
            ) : (
              <span>
                En appliquant, le solde actif de simulation du bot sera mis à jour à{' '}
                <strong className="text-white">
                  {budgetInput.toLocaleString()} {currencySymbol}
                </strong>
                .
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors w-full sm:w-auto font-medium"
            >
              {isFrench ? 'Fermer' : 'Close'}
            </button>
            <button
              onClick={handleApply}
              disabled={appliedSuccess}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto shadow-lg shadow-emerald-950/40"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isFrench
                  ? `Appliquer ce budget (${budgetInput.toLocaleString()} ${currencySymbol}) au Bot`
                  : `Apply Budget (${budgetInput.toLocaleString()} ${currencySymbol})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
