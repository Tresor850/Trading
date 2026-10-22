import React, { useState } from 'react';
import { AlertOctagon, X, ShieldAlert } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPauseOnly: () => void;
  onCloseAllAndStop: () => void;
  positionsCount: number;
  totalPnlUsd: number;
  lang: 'fr' | 'en';
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  onPauseOnly,
  onCloseAllAndStop,
  positionsCount,
  totalPnlUsd,
  lang,
}) => {
  if (!isOpen) return null;
  const isFrench = lang === 'fr';

  const [confirmCloseAll, setConfirmCloseAll] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-neutral-900 border border-rose-900/60 rounded-lg max-w-lg w-full p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertOctagon className="w-6 h-6" />
            <h2 className="text-base font-bold text-white font-mono">
              {isFrench ? 'ARRÊT D’URGENCE (KILL-SWITCH)' : 'EMERGENCY KILL-SWITCH'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-5 space-y-3 text-xs">
          <p className="text-neutral-300">
            {isFrench
              ? 'Le mécanisme d’arrêt d’urgence permet de suspendre instantanément les opérations du bot Tradng_bot en cas d’anomalie de marché ou d’incident technique (Exigence R6).'
              : 'The emergency stop mechanism instantly freezes Tradng_bot operations in case of market anomaly or incident.'}
          </p>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded font-mono">
            <div className="flex justify-between py-1">
              <span className="text-neutral-400">Positions ouvertes actuellement :</span>
              <span className="text-white font-bold">{positionsCount}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-400">P&L latent cumulé :</span>
              <span
                className={`font-bold ${
                  totalPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalPnlUsd >= 0 ? '+' : ''}
                {totalPnlUsd.toFixed(2)} USDT
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {/* Option 1: Pause entries only */}
            <button
              onClick={() => {
                onPauseOnly();
                onClose();
              }}
              className="w-full text-left p-3 rounded border border-neutral-700 bg-neutral-950 hover:bg-neutral-800 transition-colors"
            >
              <div className="font-semibold text-neutral-200">
                1. {isFrench ? 'Stopper les nouvelles entrées uniquement' : 'Pause new entries only'}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {isFrench
                  ? 'Le bot ne prendra aucun nouveau trade. Les positions existantes restent protégées par leurs ordres Stop-Loss posés sur l’exchange.'
                  : 'No new trades will be opened. Existing positions remain protected by stop-loss orders.'}
              </div>
            </button>

            {/* Option 2: Liquidate and close all */}
            <div className="p-3 rounded border border-rose-900/60 bg-rose-950/20">
              <div className="font-semibold text-rose-300">
                2. {isFrench ? 'Clôturer toutes les positions au marché et arrêter le bot' : 'Close all positions at market & stop'}
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5 mb-3">
                {isFrench
                  ? 'Vend immédiatement l’ensemble des crypto-actifs détenus en USDT et désactive le moteur.'
                  : 'Immediately liquidates all open crypto holdings into USDT and stops engine.'}
              </div>

              {!confirmCloseAll ? (
                <button
                  onClick={() => setConfirmCloseAll(true)}
                  className="px-3 py-1.5 bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-xs font-mono font-semibold rounded border border-rose-700 transition-colors"
                >
                  {isFrench ? 'Confirmer la clôture totale immédiate' : 'Confirm immediate total closure'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-rose-400 font-mono">
                    ⚠️ {isFrench ? 'Êtes-vous absolument certain ?' : 'Are you absolutely sure?'}
                  </div>
                  <button
                    onClick={() => {
                      onCloseAllAndStop();
                      onClose();
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded transition-colors"
                  >
                    {isFrench ? 'OUI, VENDRE TOUT ET ARRÊTER LE MOTEUR' : 'YES, LIQUIDATE ALL AND STOP ENGINE'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono rounded"
          >
            {isFrench ? 'Annuler' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
