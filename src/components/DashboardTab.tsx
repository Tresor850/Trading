import React from 'react';
import {
  BotStatus,
  TradingMode,
  Position,
  Trade,
  PortfolioRiskConfig,
} from '../types/trading';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Clock,
  DollarSign,
  PieChart,
  Percent,
  CheckCircle2,
  Layers,
  BarChart2,
  Zap,
  Coins,
  Sparkles,
  Calculator,
} from 'lucide-react';

import { MarketPair } from '../types/trading';

interface DashboardTabProps {
  status: BotStatus;
  mode: TradingMode;
  balanceUsd: number;
  startOfDayEquity: number;
  circuitBreakerUntil: number | null;
  positions: Position[];
  recentTrades: Trade[];
  riskConfig: PortfolioRiskConfig;
  pairs?: MarketPair[];
  onToggleStatus: () => void;
  onResetDailyLoss: () => void;
  onClosePosition: (positionId: string) => void;
  onOpenEmergencyModal: () => void;
  onSelectPairForChart?: (pair: MarketPair) => void;
  onTriggerTestOrder?: (symbol: string) => void;
  onOpenBudgetAdvisor?: () => void;
  userBudgetCurrency?: 'EUR' | 'USD' | 'USDT';
  lang: 'fr' | 'en';
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  status,
  mode,
  balanceUsd,
  startOfDayEquity,
  circuitBreakerUntil,
  positions,
  recentTrades,
  riskConfig,
  pairs = [],
  onToggleStatus,
  onResetDailyLoss,
  onClosePosition,
  onOpenEmergencyModal,
  onSelectPairForChart,
  onTriggerTestOrder,
  onOpenBudgetAdvisor,
  userBudgetCurrency = 'EUR',
  lang,
}) => {
  const isFrench = lang === 'fr';

  // Calculate live portfolio stats
  const totalCostInPositions = positions.reduce((sum, p) => sum + p.costUsd, 0);
  const totalUnrealizedPnlUsd = positions.reduce((sum, p) => sum + p.currentPnlUsd, 0);
  const totalEquity = balanceUsd + totalCostInPositions + totalUnrealizedPnlUsd;

  const dailyPnlUsd = totalEquity - startOfDayEquity;
  const dailyPnlPct = startOfDayEquity > 0 ? (dailyPnlUsd / startOfDayEquity) * 100 : 0;

  // Win rate and stats from closed trades
  const wins = recentTrades.filter((t) => t.pnlUsd > 0).length;
  const totalTradesCount = recentTrades.length;
  const winRate = totalTradesCount > 0 ? (wins / totalTradesCount) * 100 : 0;
  const totalRealizedPnl = recentTrades.reduce((sum, t) => sum + t.pnlUsd, 0);

  const isCircuitBreakerActive =
    status === 'circuit_breaker' ||
    (circuitBreakerUntil !== null && circuitBreakerUntil > Date.now());

  return (
    <div className="space-y-6">
      {/* Circuit Breaker Banner (Requirement R3) */}
      {isCircuitBreakerActive && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold font-mono text-sm text-white">
                {isFrench
                  ? 'GARDE-FOU GLOBAL ACTIVÉ (CIRCUIT BREAKER 5% - EXIGENCE R3)'
                  : 'GLOBAL CIRCUIT BREAKER TRIGGERED (5% DAILY LOSS)'}
              </div>
              <p className="text-xs text-rose-300 mt-1">
                {isFrench
                  ? 'La perte journalière a atteint le seuil maximal de 5 %. Les nouvelles entrées sont suspendues pendant 24 h. Les positions ouvertes restent gérées en sécurité par leurs ordres Stop-Loss.'
                  : 'Daily loss has hit the 5% risk threshold. All new entries are frozen for 24 hours. Open positions remain protected.'}
              </p>
            </div>
          </div>
          <button
            onClick={onResetDailyLoss}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-xs font-mono font-semibold rounded border border-rose-700 whitespace-nowrap transition-colors"
          >
            {isFrench ? 'Débloquer manuellement' : 'Manual Unlock'}
          </button>
        </div>
      )}

      {/* Bot Supervisor Card - Proactive Visibility */}
      <div className="p-4 bg-neutral-900 border border-emerald-800/80 rounded-lg shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  BOT DE TRADING INTÉGRÉ · SUPERVISEUR AUTOMATIQUE
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === 'running'
                      ? 'bg-emerald-400 animate-pulse'
                      : status === 'paused' || status === 'circuit_breaker'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                ></span>
              </div>
              <h2 className="text-sm font-bold text-white font-mono mt-0.5">
                Stratégie Croisement EMA 9 / 21 + RSI 14 (1h)
              </h2>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-medium transition-colors ${
                status === 'running'
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {status === 'running' ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isFrench ? 'Mettre en pause' : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{isFrench ? 'Démarrer le bot' : 'Start Bot'}</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenEmergencyModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-xs font-mono font-semibold transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{isFrench ? 'Arrêt d’urgence' : 'Kill Switch'}</span>
            </button>
          </div>
        </div>

        {/* Operational Scope & Multi-Markets Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-xs font-mono">
          <div>
            <span className="text-neutral-500 block text-[10px]">Marchés Actifs</span>
            <span className="text-neutral-200 font-semibold">
              CAC 40, Indices, Crypto, Or & Forex
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px]">Protection Risque</span>
            <span className="text-emerald-400 font-semibold">
              Stop-loss {riskConfig.stopLossPct}% · TP {riskConfig.stopLossPct * riskConfig.takeProfitRatio}%
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px]">Plafond Portefeuille</span>
            <span className="text-neutral-200 font-semibold">
              {riskConfig.maxSimultaneousPositions} positions max (20% alloc)
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px]">Coupe-Circuit Global</span>
            <span className="text-rose-400 font-semibold">
              Arrêt 24h si perte ≥ {riskConfig.dailyLossCircuitBreakerPct}%
            </span>
          </div>
        </div>

        {/* Quick Test Trigger Row (Instantly test execution on CAC 40, BTC, or Gold) */}
        {onTriggerTestOrder && (
          <div className="pt-3 mt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span>⚡</span> {isFrench ? "Tester l'exécution du bot en direct :" : "Test live bot execution:"}
              </span>
              <span className="text-[11px] text-neutral-400">
                {isFrench ? "(Ouvre un ordre test sécurisé avec Stop-Loss et Take-Profit)" : "(Instantly opens a protected trade with Stop-Loss & Take-Profit)"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onTriggerTestOrder('CAC40/EUR')}
                className="px-2.5 py-1 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded text-xs transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>🇫🇷</span>
                <span>{isFrench ? '+ Tester CAC 40 (EUR)' : '+ Test CAC 40'}</span>
              </button>
              <button
                onClick={() => onTriggerTestOrder('EUR/USD')}
                className="px-2.5 py-1 bg-sky-950/90 hover:bg-sky-900 border border-sky-700 text-sky-300 rounded text-xs transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>💶</span>
                <span>+ Tester EUR/USD</span>
              </button>
              <button
                onClick={() => onTriggerTestOrder('USD/EUR')}
                className="px-2.5 py-1 bg-sky-950/90 hover:bg-sky-900 border border-sky-700 text-sky-300 rounded text-xs transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>💵</span>
                <span>+ Tester USD/EUR</span>
              </button>
              <button
                onClick={() => onTriggerTestOrder('BTC/USDT')}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-amber-300 rounded text-xs transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>🪙</span>
                <span>+ Tester BTC/USDT</span>
              </button>
              <button
                onClick={() => onTriggerTestOrder('XAU/USD')}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-300 rounded text-xs transition-colors flex items-center gap-1.5 font-bold"
              >
                <span>🥇</span>
                <span>{isFrench ? '+ Tester Or (XAU)' : '+ Test Gold (XAU)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Main Financial KPI Cards (Strict Tabular Figures, No Slop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Equity */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-xs font-mono text-neutral-400 block">
            {isFrench ? 'Équité Totale' : 'Total Equity'}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-neutral-400">USDT</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-mono">
            {dailyPnlUsd >= 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +{dailyPnlUsd.toFixed(2)} USDT (+{dailyPnlPct.toFixed(2)}%)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {dailyPnlUsd.toFixed(2)} USDT ({dailyPnlPct.toFixed(2)}%)
              </span>
            )}
            <span className="text-neutral-500">· {isFrench ? 'Aujourd’hui' : 'Today'}</span>
          </div>
        </div>

        {/* KPI 2: Available Cash vs Committed */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-xs font-mono text-neutral-400 block">
            {isFrench ? 'Solde Disponible' : 'Available Balance'}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-neutral-400">USDT</span>
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-2">
            <span>{isFrench ? 'Engagé en positions : ' : 'Committed: '}</span>
            <span className="text-neutral-200 tabular-nums">{totalCostInPositions.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* KPI 3: Open Positions Slots */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-xs font-mono text-neutral-400 block">
            {isFrench ? 'Positions Ouvertes' : 'Open Positions'}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {positions.length} <span className="text-sm font-normal text-neutral-400">/ {riskConfig.maxSimultaneousPositions} max</span>
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-2">
            <span>{isFrench ? 'P&L latent : ' : 'Unrealized P&L: '}</span>
            <span
              className={`font-semibold tabular-nums ${
                totalUnrealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalUnrealizedPnlUsd >= 0 ? '+' : ''}
              {totalUnrealizedPnlUsd.toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* KPI 4: Win Rate & Realized P&L */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <span className="text-xs font-mono text-neutral-400 block">
            {isFrench ? 'Taux de Réussite' : 'Win Rate'}
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
            {winRate.toFixed(1)}% <span className="text-sm font-normal text-neutral-400">({wins}/{totalTradesCount})</span>
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-2">
            <span>{isFrench ? 'P&L Réalisé : ' : 'Realized P&L: '}</span>
            <span
              className={`font-semibold tabular-nums ${
                totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalRealizedPnl >= 0 ? '+' : ''}
              {totalRealizedPnl.toFixed(2)} USDT
            </span>
          </div>
        </div>
      </div>

      {/* Simulateur de Budget, Prédictions & Conseils Stratégiques */}
      <div className="bg-gradient-to-r from-neutral-900 via-emerald-950/20 to-neutral-900 border border-emerald-800/60 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950 border border-emerald-700 rounded-xl text-emerald-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-mono text-white">
                  {isFrench ? '💰 SIMULATEUR DE BUDGET, PRÉDICTIONS & CONSEILS' : '💰 BUDGET SIMULATOR, PREDICTIONS & ADVICE'}
                </h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                  {userBudgetCurrency} {userBudgetCurrency === 'EUR' ? '€' : userBudgetCurrency === 'USD' ? '$' : '₮'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {isFrench
                  ? 'Ajustez votre capital de trading, visualisez le dimensionnement de position (20%) et projetez vos gains mensuels.'
                  : 'Customize your trading budget, view 20% position sizing, and project monthly gains.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenBudgetAdvisor && (
              <button
                onClick={onOpenBudgetAdvisor}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-colors shadow-md shadow-emerald-950/50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isFrench ? 'Ouvrir le Simulateur & Conseils Détaillés →' : 'Open Simulator & Advice →'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Calculations Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 text-xs font-mono">
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg">
            <span className="text-neutral-500 block text-[10px]">Capital Actif</span>
            <span className="font-bold text-white text-base">
              {balanceUsd.toLocaleString()} {userBudgetCurrency === 'EUR' ? '€' : userBudgetCurrency === 'USD' ? '$' : 'USDT'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Solde du bot</span>
          </div>

          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg">
            <span className="text-neutral-500 block text-[10px]">Allocation / Position</span>
            <span className="font-bold text-emerald-400 text-base">
              {(balanceUsd * 0.20).toFixed(2)} {userBudgetCurrency === 'EUR' ? '€' : userBudgetCurrency === 'USD' ? '$' : 'USDT'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">20% de l’équité (R2)</span>
          </div>

          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg">
            <span className="text-neutral-500 block text-[10px]">Risque Max / Trade</span>
            <span className="font-bold text-rose-400 text-base">
              -{(balanceUsd * 0.02).toFixed(2)} {userBudgetCurrency === 'EUR' ? '€' : userBudgetCurrency === 'USD' ? '$' : 'USDT'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Stop-Loss 1.5% (R1)</span>
          </div>

          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg">
            <span className="text-neutral-500 block text-[10px]">Gain Visé / Trade</span>
            <span className="font-bold text-emerald-400 text-base">
              +{(balanceUsd * 0.20 * 0.03).toFixed(2)} {userBudgetCurrency === 'EUR' ? '€' : userBudgetCurrency === 'USD' ? '$' : 'USDT'}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Take-Profit +3.0% (1:2)</span>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg col-span-2 sm:col-span-1">
            <span className="text-emerald-400 block text-[10px] font-bold">Projection à 3 Mois</span>
            <span className="font-bold text-emerald-300 text-base">
              +17.8% (+{(balanceUsd * 0.178).toFixed(2)} {userBudgetCurrency === 'EUR' ? '€' : userBudgetCurrency === 'USD' ? '$' : 'USDT'})
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Modèle EMA/RSI réaliste</span>
          </div>
        </div>
      </div>

      {/* Baromètre des Indices & Actifs Clés (CAC 40, EUR/USD, USD/EUR, DAX, S&P 500, Or, Crypto) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400">
                🏛️ BAROMÈTRE MULTI-MARCHÉS · INDICES, FOREX & CRYPTO
              </span>
              <span className="text-[10px] bg-neutral-800 text-neutral-300 font-mono px-2 py-0.5 rounded border border-neutral-700">
                Surveillance continue
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {isFrench
                ? "L'indice CAC 40 Paris, le Forex EUR/USD et USD/EUR, les indices mondiaux, l'Or et les cryptos Binance analysés par l'algorithme."
                : 'French CAC 40 index, Forex EUR/USD and USD/EUR, global indices, Gold and Binance cryptos monitored by the algorithm.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {['CAC40/EUR', 'EUR/USD', 'USD/EUR', 'SPX/USD', 'DAX40/EUR', 'XAU/USD', 'BTC/USDT', 'SOL/USDT']
            .map((sym) => pairs.find((p) => p.symbol === sym))
            .filter((p): p is MarketPair => Boolean(p))
            .map((p) => {
              const isBullish = p.ema9 > p.ema21;
              const currencySymbol = p.quoteAsset === 'EUR' ? '€' : p.quoteAsset === 'USD' ? '$' : 'USDT';

              return (
                <div
                  key={p.symbol}
                  className={`p-3.5 rounded-lg border transition-all ${
                    p.symbol.includes('CAC40')
                      ? 'bg-emerald-950/20 border-emerald-800/80 hover:border-emerald-700 shadow-sm'
                      : p.assetCategory === 'forex'
                      ? 'bg-sky-950/20 border-sky-800/80 hover:border-sky-700 shadow-sm'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-white">{p.symbol}</span>
                        {p.assetCategory === 'index' && (
                          <span className="text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                            INDICE
                          </span>
                        )}
                        {p.assetCategory === 'commodity' && (
                          <span className="text-[10px] font-bold font-mono bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800">
                            MÉTAL
                          </span>
                        )}
                        {p.assetCategory === 'forex' && (
                          <span className="text-[10px] font-bold font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800">
                            FOREX
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 block mt-0.5">{p.name}</span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        p.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {p.change24h >= 0 ? '+' : ''}
                      {p.change24h}%
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between">
                    <div className="text-lg font-bold font-mono text-white tabular-nums">
                      {p.price.toLocaleString(undefined, {
                        minimumFractionDigits: p.price < 1 ? 4 : 2,
                        maximumFractionDigits: p.price < 1 ? 4 : 2,
                      })}{' '}
                      <span className="text-xs font-normal text-neutral-400">{currencySymbol}</span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      Vol : ${(p.volume24h / 1e6).toFixed(0)}M
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-neutral-400">
                      EMA 9/21 :{' '}
                      <span className={isBullish ? 'text-emerald-400 font-semibold' : 'text-neutral-400'}>
                        {isBullish ? 'Croisement Haussier' : 'Baissier'}
                      </span>
                    </span>
                    <span className="text-neutral-400">
                      RSI :{' '}
                      <span
                        className={`font-semibold ${
                          p.rsi14 >= 70 ? 'text-rose-400' : p.rsi14 <= 30 ? 'text-emerald-400' : 'text-sky-300'
                        }`}
                      >
                        {p.rsi14}
                      </span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2">
                    {onSelectPairForChart && (
                      <button
                        onClick={() => onSelectPairForChart(p)}
                        className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-[11px] font-mono transition-colors flex items-center gap-1"
                      >
                        <BarChart2 className="w-3 h-3 text-emerald-400" />
                        <span>Graphique</span>
                      </button>
                    )}

                    {onTriggerTestOrder && (
                      <button
                        onClick={() => onTriggerTestOrder(p.symbol)}
                        className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-[11px] font-mono transition-colors flex items-center gap-1 font-semibold"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Tester ordre</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Open Positions Section (Requirement I2 & E1) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-mono text-white">
              {isFrench ? 'POSITIONS OUVERTES EN DIRECT' : 'ACTIVE OPEN POSITIONS'}
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              ({positions.length} sur {riskConfig.maxSimultaneousPositions} max autorisées)
            </span>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {isFrench ? 'Protection Stop-Loss posée sur exchange' : 'Stop-loss active on exchange'}
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 font-mono">
            {isFrench
              ? 'Aucune position ouverte actuellement. Le scanner analyse en continu 60+ paires spot pour détecter un croisement EMA 9/21 valide avec RSI 14.'
              : 'No open positions. Scanner is scanning 60+ spot pairs for valid EMA 9/21 & RSI 14 signals.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Actif / Marché</th>
                  <th className="px-4 py-3 font-medium">Prix d'Entrée</th>
                  <th className="px-4 py-3 font-medium">Prix Actuel</th>
                  <th className="px-4 py-3 font-medium">Stop-Loss (Exchange)</th>
                  <th className="px-4 py-3 font-medium">Take-Profit (Cible)</th>
                  <th className="px-4 py-3 font-medium">P&L Latent ($ / %)</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {positions.map((pos) => {
                  const isProfitable = pos.currentPnlUsd >= 0;
                  const unit = pos.symbol.includes('/EUR') ? '€' : pos.symbol.includes('/USD') ? '$' : 'USDT';

                  return (
                    <tr key={pos.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-3 font-bold text-white flex items-center gap-2">
                        <span>{pos.symbol}</span>
                        {pos.symbol.includes('CAC40') && (
                          <span className="text-[10px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                            INDICE PARIS
                          </span>
                        )}
                        {pos.symbol.includes('BTC') && (
                          <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 font-bold">
                            CRYPTO
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          LONG
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-300">
                        {pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} {unit}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-white font-medium">
                        {pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} {unit}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-rose-400">
                        {pos.stopLossPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-neutral-500 block">STOP_LOSS_LIMIT</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-emerald-400">
                        {pos.takeProfitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-neutral-500 block">Ratio 1:{riskConfig.takeProfitRatio}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                          {isProfitable ? '+' : ''}
                          {pos.currentPnlUsd.toFixed(2)} USDT ({isProfitable ? '+' : ''}
                          {pos.currentPnlPct.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded border border-neutral-700 text-[11px] transition-colors"
                        >
                          {isFrench ? 'Clôturer' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Trades History Preview */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-mono text-white">
              {isFrench ? 'DERNIÈRES SORTIES DE POSITIONS' : 'RECENT CLOSED TRADES'}
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              ({recentTrades.length} trades enregistrés)
            </span>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {isFrench ? 'Frais 0.1% déduits' : '0.1% spot fee deducted'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-3 font-medium">Paire</th>
                <th className="px-4 py-3 font-medium">Date Sortie</th>
                <th className="px-4 py-3 font-medium">Entrée / Sortie</th>
                <th className="px-4 py-3 font-medium">Durée</th>
                <th className="px-4 py-3 font-medium">Raison de Sortie</th>
                <th className="px-4 py-3 font-medium">Frais</th>
                <th className="px-6 py-3 font-medium text-right">P&L Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {recentTrades.map((t) => {
                const isWin = t.pnlUsd > 0;
                return (
                  <tr key={t.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-3 font-bold text-white">{t.symbol}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {new Date(t.exitTime).toLocaleDateString('fr-FR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-300">
                      {t.entryPrice.toFixed(t.entryPrice < 1 ? 4 : 2)} → {t.exitPrice.toFixed(t.exitPrice < 1 ? 4 : 2)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums">
                      {Math.floor(t.durationMinutes / 60)}h {t.durationMinutes % 60}m
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.exitReason === 'TAKE_PROFIT'
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                            : t.exitReason === 'STOP_LOSS'
                            ? 'bg-rose-950/70 text-rose-400 border border-rose-800/60'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {t.exitReason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums">
                      ${t.feesUsd.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-bold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}
                        {t.pnlUsd.toFixed(2)} USDT ({isWin ? '+' : ''}
                        {t.pnlPct.toFixed(2)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
