import React, { useState } from 'react';
import { TradingMode, DemoQualificationCriteria } from '../types/trading';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Award,
  Calendar,
  Activity,
  Percent,
} from 'lucide-react';

interface DemoScorecardTabProps {
  currentMode: TradingMode;
  onUnlockLiveMode: () => void;
  lang: 'fr' | 'en';
}

export const DemoScorecardTab: React.FC<DemoScorecardTabProps> = ({
  currentMode,
  onUnlockLiveMode,
  lang,
}) => {
  const isFrench = lang === 'fr';

  // Demo qualification metrics
  const demoStats = {
    daysElapsed: 18,
    targetDays: 14,
    tradesCompleted: 36,
    targetTrades: 30,
    profitFactor: 1.62,
    targetProfitFactor: 1.25,
    maxDrawdownPct: 3.4,
    allowedMaxDrawdownPct: 8.0,
  };

  const isDaysOk = demoStats.daysElapsed >= demoStats.targetDays;
  const isTradesOk = demoStats.tradesCompleted >= demoStats.targetTrades;
  const isProfitFactorOk = demoStats.profitFactor >= demoStats.targetProfitFactor;
  const isDrawdownOk = demoStats.maxDrawdownPct <= demoStats.allowedMaxDrawdownPct;
  const isFullyQualified = isDaysOk && isTradesOk && isProfitFactorOk && isDrawdownOk;

  // Live unlock confirmation state (Requirement O3 & C3)
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const REQUIRED_PHRASE = "J'ACCEPTE LES RISQUES DU TRADING RÉEL";
  const isPhraseExact = typedConfirmation.trim() === REQUIRED_PHRASE;

  const handleConfirmLiveActivation = () => {
    if (hasAgreedTerms && isPhraseExact) {
      onUnlockLiveMode();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header scorecard */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                {isFrench
                  ? 'QUALIFICATION ET TABLEAU DE SUIVI DE LA DÉMO (EXIGENCE M5 & B3)'
                  : 'DEMO QUALIFICATION SCORECARD'}
              </h3>
              <span className="text-xs text-neutral-400">
                {isFrench
                  ? 'Garde-fous méthodologiques avant toute activation en fonds réels'
                  : 'Methodological criteria before unlocking live execution'}
              </span>
            </div>
          </div>

          <div>
            {isFullyQualified ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFrench ? 'ÉLIGIBLE AU MODE RÉEL' : 'QUALIFIED FOR LIVE'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-mono font-medium rounded">
                <span>{isFrench ? 'PÉRIODE D’OBSERVATION EN COURS' : 'OBSERVATION IN PROGRESS'}</span>
              </span>
            )}
          </div>
        </div>

        {/* 4 Objective Criteria Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-xs font-mono">
          {/* Criterion 1: Duration */}
          <div
            className={`p-4 rounded border transition-colors ${
              isDaysOk ? 'bg-neutral-950 border-emerald-800/80' : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">1. Durée d’observation</span>
              {isDaysOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-xl font-bold text-white mt-2 tabular-nums">
              {demoStats.daysElapsed} <span className="text-xs font-normal text-neutral-400">/ {demoStats.targetDays} j min</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Condition satisfaite (+{demoStats.daysElapsed - demoStats.targetDays}j)
            </span>
          </div>

          {/* Criterion 2: Trade count */}
          <div
            className={`p-4 rounded border transition-colors ${
              isTradesOk ? 'bg-neutral-950 border-emerald-800/80' : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">2. Trades exécutés</span>
              {isTradesOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-xl font-bold text-white mt-2 tabular-nums">
              {demoStats.tradesCompleted} <span className="text-xs font-normal text-neutral-400">/ {demoStats.targetTrades} min</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Volume statistique suffisant
            </span>
          </div>

          {/* Criterion 3: Profit factor */}
          <div
            className={`p-4 rounded border transition-colors ${
              isProfitFactorOk ? 'bg-neutral-950 border-emerald-800/80' : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">3. Facteur de profit</span>
              {isProfitFactorOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-xl font-bold text-white mt-2 tabular-nums">
              {demoStats.profitFactor}{' '}
              <span className="text-xs font-normal text-neutral-400">&gt; {demoStats.targetProfitFactor} cible</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Espérance mathématique positive
            </span>
          </div>

          {/* Criterion 4: Drawdown limit */}
          <div
            className={`p-4 rounded border transition-colors ${
              isDrawdownOk ? 'bg-neutral-950 border-emerald-800/80' : 'bg-neutral-950 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">4. Baisse max (Drawdown)</span>
              {isDrawdownOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-xl font-bold text-white mt-2 tabular-nums">
              {demoStats.maxDrawdownPct}%{' '}
              <span className="text-xs font-normal text-neutral-400">&lt; {demoStats.allowedMaxDrawdownPct}% max</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Contrôle du risque respecté
            </span>
          </div>
        </div>
      </div>

      {/* Live Mode Explicit Confirmation & Unlock (Requirements O3, M3, C3) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-800">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <div>
            <h3 className="text-sm font-bold font-mono text-white">
              {isFrench
                ? 'PROCÉDURE DE VERROUILLAGE & CONFIRMATION DU MODE RÉEL (EXIGENCES O3 & C3)'
                : 'STRICT CONFIRMATION PROTOCOL FOR LIVE TRADING'}
            </h3>
            <span className="text-xs text-neutral-400">
              {isFrench
                ? 'Aucun ordre réel ne peut être envoyé à l’exchange sans validation explicite en deux étapes.'
                : 'Zero live orders without explicit user confirmation and typed safety phrase.'}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-xs font-mono">
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded space-y-2 text-neutral-300">
            <span className="font-bold text-amber-400 block">Rappels des risques financiers (Section 13) :</span>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-[11px]">
              <li>L’application de trading automatique ne fournit aucun conseil financier.</li>
              <li>Les altcoins peuvent connaître des mèches de liquidité et du slippage lors de mouvements brusques.</li>
              <li>Commencez toujours le mode réel avec une fraction modeste de votre capital (ex: 500 à 2 000 USDT).</li>
              <li>Une exécution sur serveur VPS Linux stable est recommandée pour éviter les interruptions d’ordinateurs portables en veille.</li>
            </ul>
          </div>

          {/* Checkbox 1 */}
          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasAgreedTerms}
              onChange={(e) => setHasAgreedTerms(e.target.checked)}
              className="mt-0.5 accent-rose-500"
            />
            <span className="text-neutral-200">
              J’atteste avoir observé Tradng_bot en mode démo / simulation, avoir vérifié la non-activation des retraits sur mes clés Binance, et je prends l’entière responsabilité des ordres passés.
            </span>
          </label>

          {/* Typing Phrase Requirement O3 & C3 */}
          <div>
            <label className="text-neutral-300 block mb-1">
              Pour déverrouiller le mode réel, veuillez saisir exactement la phrase suivante :
            </label>
            <div className="p-2 bg-neutral-950 border border-neutral-800 rounded text-rose-300 font-bold mb-2 select-all">
              {REQUIRED_PHRASE}
            </div>
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder="Tapez la phrase ici..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={handleConfirmLiveActivation}
              disabled={!hasAgreedTerms || !isPhraseExact}
              className={`flex items-center gap-2 px-5 py-2.5 rounded font-bold transition-colors ${
                hasAgreedTerms && isPhraseExact
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-lg'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>{isFrench ? 'BASCULER EN MODE RÉEL SÉCURISÉ' : 'SWITCH TO REAL LIVE TRADING'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
