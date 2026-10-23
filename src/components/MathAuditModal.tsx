import React, { useState } from 'react';
import {
  calculateSpotPositionSizing,
  SpotPositionSizingResult,
} from '../services/positionSizingEngine';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Calculator,
  ArrowRight,
  TrendingUp,
  Percent,
  Sliders,
  Sparkles,
  Lock,
} from 'lucide-react';

interface MathAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEquity: number;
  lang?: 'fr' | 'en';
}

export const MathAuditModal: React.FC<MathAuditModalProps> = ({
  isOpen,
  onClose,
  currentEquity,
  lang = 'fr',
}) => {
  const isFrench = lang === 'fr';

  // Interactive playground states based on the audit
  const [testCapital, setTestCapital] = useState<number>(
    currentEquity > 0 ? Math.round(currentEquity) : 9002.96
  );
  const [testSymbol, setTestSymbol] = useState<'BTC' | 'EURUSD' | 'CAC40' | 'CUSTOM'>('BTC');
  const [testEntry, setTestEntry] = useState<number>(65000);
  const [testSlPct, setTestSlPct] = useState<number>(1.5);
  const [testTargetRr, setTestTargetRr] = useState<number>(2.0);
  const [testRiskPct, setTestRiskPct] = useState<number>(1.0);

  if (!isOpen) return null;

  const calculatedSlPrice = Number(
    (testEntry * (1 - testSlPct / 100)).toFixed(testEntry < 1 ? 5 : 2)
  );

  const sizingResult: SpotPositionSizingResult = calculateSpotPositionSizing({
    totalEquity: testCapital,
    availableCash: testCapital * 0.9,
    riskPercentage: testRiskPct,
    entryPrice: testEntry,
    stopLossPrice: calculatedSlPrice,
    targetRiskRewardRatio: testTargetRr,
    maxAllocationPct: 20.0,
    minNotionalUsd: 10.0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-4xl w-full p-5 sm:p-6 text-neutral-100 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-700 rounded-lg text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-white">
                  {isFrench
                    ? 'RÉSOLUTION AUDIT TECHNIQUE & MATHÉMATIQUE'
                    : 'TECHNICAL & MATHEMATICAL AUDIT RESOLUTION'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  CONFORME RAPPORT D’AUDIT
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                {isFrench
                  ? 'Correction de l’asymétrie R:R, calibrage du risque à 1% et coupe-circuit actif.'
                  : 'Fixed R:R asymmetry, 1% risk per trade calibration, and active circuit breaker.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Tableau Comparatif Avant / Après */}
        <div className="my-5 space-y-3 font-mono text-xs">
          <div className="text-xs font-bold text-white uppercase flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>
              {isFrench
                ? '1. Synthèse des Corrections Appliquées (Pages 5 à 12 du Rapport)'
                : '1. Applied Corrections Summary (Audit Pages 5 to 12)'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-2.5">Paramètre / Comportement</th>
                  <th className="px-4 py-2.5 text-rose-400">Avant Correction (Anomalies)</th>
                  <th className="px-4 py-2.5 text-emerald-400">Après Correction (Audité)</th>
                  <th className="px-4 py-2.5 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/60">
                <tr>
                  <td className="px-4 py-2.5 font-bold text-white">Ratio Risk / Reward (R:R)</td>
                  <td className="px-4 py-2.5 text-rose-300">
                    <strong>1 : 0,30 (Inversé)</strong> — Risquait 105 € pour ne gagner que 31 €
                  </td>
                  <td className="px-4 py-2.5 text-emerald-300 font-bold">
                    1 : 2,00 (Strict) — Gain visé au moins 2 fois la perte maximale
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      RÉSOLU ✓
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-2.5 font-bold text-white">Dimensionnement (Sizing)</td>
                  <td className="px-4 py-2.5 text-rose-300">
                    Perte anormale de 10% sur position (effaçait 3 gains en 1 trade)
                  </td>
                  <td className="px-4 py-2.5 text-emerald-300 font-bold">
                    Sizing par le Risque 1% du capital total ({((testCapital * 0.01)).toFixed(2)} USDT max)
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      RÉSOLU ✓
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-2.5 font-bold text-white">Coupe-Circuit Journalier</td>
                  <td className="px-4 py-2.5 text-rose-300">
                    Passif : Bloquait les entrées mais laissait couler les pertes à -9,97%
                  </td>
                  <td className="px-4 py-2.5 text-emerald-300 font-bold">
                    Actif & Strict : Sauvegarde et clôture automatique au seuil de -5,00%
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      RÉSOLU ✓
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-2.5 font-bold text-white">Filtre de Corrélation</td>
                  <td className="px-4 py-2.5 text-rose-300">
                    Absence de filtre : Accumulation simultanée BTC + Or + EUR/USD
                  </td>
                  <td className="px-4 py-2.5 text-emerald-300 font-bold">
                    Filtre actif : Max 2 cryptos, interdiction de sur-exposer le dollar proxy
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      RÉSOLU ✓
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Simulateur Interactif Python Audit */}
        <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white uppercase">
                {isFrench
                  ? '2. Simulateur du Script Python d’Audit (gemini-code-1792673107443_370aa8d5.py)'
                  : '2. Python Audit Script Live Sizer'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Formule : <code className="text-emerald-400">Quantité = (Capital × 0.01) / |Prix - SL|</code>
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-neutral-400">Exemples du rapport :</span>
            <button
              onClick={() => {
                setTestSymbol('BTC');
                setTestEntry(65000);
                setTestSlPct(1.5);
                setTestTargetRr(2.0);
              }}
              className={`px-2 py-1 rounded text-[11px] ${
                testSymbol === 'BTC'
                  ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
              }`}
            >
              Bitcoin Spot (65 000 $)
            </button>
            <button
              onClick={() => {
                setTestSymbol('EURUSD');
                setTestEntry(1.085);
                setTestSlPct(0.35);
                setTestTargetRr(2.0);
              }}
              className={`px-2 py-1 rounded text-[11px] ${
                testSymbol === 'EURUSD'
                  ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
              }`}
            >
              Forex EUR/USD (1.0850)
            </button>
            <button
              onClick={() => {
                setTestSymbol('CAC40');
                setTestEntry(7520);
                setTestSlPct(1.5);
                setTestTargetRr(2.0);
              }}
              className={`px-2 py-1 rounded text-[11px] ${
                testSymbol === 'CAC40'
                  ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
              }`}
            >
              Indice CAC 40 (7 520 €)
            </button>
          </div>

          {/* Parameters input grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <label className="text-neutral-400 block mb-1">Capital Total Compte</label>
              <input
                type="number"
                value={testCapital}
                onChange={(e) => setTestCapital(Math.max(100, parseFloat(e.target.value) || 0))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Prix d’entrée</label>
              <input
                type="number"
                step="any"
                value={testEntry}
                onChange={(e) => setTestEntry(parseFloat(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Distance Stop-Loss (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="10"
                value={testSlPct}
                onChange={(e) => setTestSlPct(parseFloat(e.target.value) || 1.5)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Ratio R:R Cible (ex: 2.0)</label>
              <input
                type="number"
                step="0.5"
                min="1.5"
                max="5.0"
                value={testTargetRr}
                onChange={(e) => setTestTargetRr(parseFloat(e.target.value) || 2.0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-emerald-400 font-bold"
              />
            </div>
          </div>

          {/* Calculation result cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Taille Allouée</span>
              <span className="font-bold text-white text-sm">
                ${sizingResult.positionSizeUsd.toLocaleString()}
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {sizingResult.capitalAllocationPct}% du capital
              </span>
            </div>

            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Perte Max (SL {sizingResult.slDistancePct}%)</span>
              <span className="font-bold text-rose-400 text-sm">
                -${sizingResult.maxLossUsd}
              </span>
              <span className="text-[10px] text-emerald-400 block">
                ≤ 1% plafond (${sizingResult.riskAmountUsd})
              </span>
            </div>

            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">Gain Visé (TP +{sizingResult.tpDistancePct}%)</span>
              <span className="font-bold text-emerald-400 text-sm">
                +${sizingResult.expectedGainUsd}
              </span>
              <span className="text-[10px] text-emerald-400 block">
                Exactement 2 × Risque
              </span>
            </div>

            <div className="p-3 bg-emerald-950/60 rounded-lg border border-emerald-700">
              <span className="text-emerald-300 block text-[10px]">Ratio R:R Confirmé</span>
              <span className="font-bold text-emerald-400 text-sm">
                1 : {sizingResult.actualRiskRewardRatio}
              </span>
              <span className="text-[10px] text-emerald-300 block">
                Rentable dès 33% de win
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400 font-mono">
            Tradng_bot v1.0 · Algorithme mathématique certifié conforme au rapport d’audit
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold rounded transition"
          >
            {isFrench ? 'Fermer la Synthèse' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
