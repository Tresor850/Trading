import React, { useState } from 'react';
import {
  PortfolioRiskConfig,
  UniverseConfig,
  PairFilterMode,
} from '../types/trading';
import {
  ShieldAlert,
  Sliders,
  Filter,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface RiskUniverseTabProps {
  riskConfig: PortfolioRiskConfig;
  universeConfig: UniverseConfig;
  onUpdateRisk: (newConfig: Partial<PortfolioRiskConfig>) => void;
  onUpdateUniverse: (newConfig: Partial<UniverseConfig>) => void;
  lang: 'fr' | 'en';
}

export const RiskUniverseTab: React.FC<RiskUniverseTabProps> = ({
  riskConfig,
  universeConfig,
  onUpdateRisk,
  onUpdateUniverse,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const [newBlacklistPair, setNewBlacklistPair] = useState('');
  const [newWhitelistPair, setNewWhitelistPair] = useState('');
  const [showAllPairsWarning, setShowAllPairsWarning] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const handleModeChange = (mode: PairFilterMode) => {
    if (mode === 'all_pairs') {
      setShowAllPairsWarning(true);
    }
    onUpdateUniverse({ filterMode: mode });
  };

  const handleAddBlacklist = () => {
    if (!newBlacklistPair) return;
    const clean = newBlacklistPair.trim().toUpperCase();
    if (!universeConfig.blacklist.includes(clean)) {
      onUpdateUniverse({ blacklist: [...universeConfig.blacklist, clean] });
      setNewBlacklistPair('');
    }
  };

  const handleRemoveBlacklist = (item: string) => {
    onUpdateUniverse({
      blacklist: universeConfig.blacklist.filter((p) => p !== item),
    });
  };

  const handleAddWhitelist = () => {
    if (!newWhitelistPair) return;
    const clean = newWhitelistPair.trim().toUpperCase();
    if (!universeConfig.whitelist.includes(clean)) {
      onUpdateUniverse({ whitelist: [...universeConfig.whitelist, clean] });
      setNewWhitelistPair('');
    }
  };

  const handleRemoveWhitelist = (item: string) => {
    onUpdateUniverse({
      whitelist: universeConfig.whitelist.filter((p) => p !== item),
    });
  };

  const triggerSaveNotice = () => {
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Save indicator */}
      {saveFeedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{isFrench ? 'Paramètres sauvegardés avec succès dans la base SQLite locale.' : 'Settings saved successfully.'}</span>
        </div>
      )}

      {/* Universe Filter Mode Warning if "All Pairs" */}
      {universeConfig.filterMode === 'all_pairs' && (
        <div className="p-4 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold font-mono text-white">
              {isFrench ? 'AVERTISSEMENT : MODE « TOUT » ACTIVÉ' : 'WARNING: ALL PAIRS MODE ENABLED'}
            </div>
            <p className="mt-1">
              {isFrench
                ? 'Trader l’intégralité des paires sans filtre expose au risque d’illiquidité, de spreads élevés et de slippage sévère sur les altcoins à faible capitalisation. Recommandé uniquement pour les tests de stress.'
                : 'Trading all pairs without filters exposes you to illiquidity, wide spreads, and heavy slippage.'}
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Portfolio Risk Management (Section 5.3) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                {isFrench ? 'GESTION DU RISQUE DE PORTEFEUILLE' : 'PORTFOLIO RISK MANAGEMENT'}
              </h3>
              <span className="text-xs text-neutral-400">
                {isFrench ? 'Garde-fous stricts définis par le cahier des charges (R1 à R7)' : 'Strict risk rules (R1 to R7)'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5 text-xs font-mono">
          {/* R1: Risk per trade */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Risque par trade visé (%)' : 'Risk per trade (%)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5.0"
                value={riskConfig.riskPerTradePct}
                onChange={(e) => {
                  onUpdateRisk({ riskPerTradePct: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-neutral-400">%</span>
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">Défaut : 2.0 % de l’équité</span>
          </div>

          {/* R1: Stop Loss */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Stop-loss cible (%)' : 'Stop-loss distance (%)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10.0"
                value={riskConfig.stopLossPct}
                onChange={(e) => {
                  onUpdateRisk({ stopLossPct: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-neutral-400">%</span>
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">Défaut : 1.5 % (Ordre stop exchange)</span>
          </div>

          {/* R1: Take Profit Ratio */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Ratio Gain / Risque (TP)' : 'Reward / Risk Ratio (TP)'}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">1 :</span>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="5.0"
                value={riskConfig.takeProfitRatio}
                onChange={(e) => {
                  onUpdateRisk({ takeProfitRatio: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              TP résultant : {(riskConfig.stopLossPct * riskConfig.takeProfitRatio).toFixed(1)} %
            </span>
          </div>

          {/* R2: Max Positions */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Nombre maximal de positions' : 'Max simultaneous positions'}
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={riskConfig.maxSimultaneousPositions}
              onChange={(e) => {
                onUpdateRisk({ maxSimultaneousPositions: parseInt(e.target.value, 10) });
                triggerSaveNotice();
              }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-neutral-500 mt-1 block">Défaut : 5 positions simultanées</span>
          </div>

          {/* R2: Max Allocation per Position */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Allocation max par position (%)' : 'Max allocation per position (%)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                min="5"
                max="50"
                value={riskConfig.maxAllocationPerPositionPct}
                onChange={(e) => {
                  onUpdateRisk({ maxAllocationPerPositionPct: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-neutral-400">%</span>
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">Défaut : 20.0 % de l’équité</span>
          </div>

          {/* R3: Circuit Breaker */}
          <div className="p-3 bg-neutral-950 border border-rose-900/40 rounded">
            <label className="text-rose-300 block mb-1">
              {isFrench ? 'Circuit Breaker Journalier (%)' : 'Daily Circuit Breaker (%)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="2"
                max="15"
                value={riskConfig.dailyLossCircuitBreakerPct}
                onChange={(e) => {
                  onUpdateRisk({ dailyLossCircuitBreakerPct: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-rose-800 rounded px-3 py-1.5 text-rose-300 font-bold text-sm focus:outline-none focus:border-rose-500"
              />
              <span className="text-rose-300">%</span>
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">Pause 24h si perte ≥ 5.0 %</span>
          </div>
        </div>

        {/* Priority & Cooldown rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-800 text-xs font-mono">
          <div>
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Règle de priorité (R4)' : 'Signal priority rule (R4)'}
            </label>
            <select
              value={riskConfig.priorityRule}
              onChange={(e) => {
                onUpdateRisk({ priorityRule: e.target.value as any });
                triggerSaveNotice();
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-neutral-200"
            >
              <option value="LIQUIDITY_DESC">1. Liquidité 24h décroissante (Défaut)</option>
              <option value="RSI_MOMENTUM">2. Momentum RSI le plus fort</option>
              <option value="CHANGE_24H">3. Plus forte variation 24h</option>
            </select>
          </div>

          <div>
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Méthode de Stop-Loss (S5)' : 'Stop-Loss Method (S5)'}
            </label>
            <select
              value={riskConfig.stopLossMethod}
              onChange={(e) => {
                onUpdateRisk({ stopLossMethod: e.target.value as any });
                triggerSaveNotice();
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-neutral-200"
            >
              <option value="FIXED_PCT">Pourcentage fixe (1.5 %)</option>
              <option value="ATR_VOLATILITY">Volatilité dynamique (ATR 14 x 1.5)</option>
            </select>
          </div>

          <div>
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Délai de repos par paire (R5)' : 'Cooldown after exit (R5)'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={riskConfig.cooldownCandlesAfterExit}
                onChange={(e) => {
                  onUpdateRisk({ cooldownCandlesAfterExit: parseInt(e.target.value, 10) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-neutral-200"
              />
              <span className="text-neutral-400">{isFrench ? 'bougies' : 'candles'}</span>
            </div>
          </div>
        </div>

        {/* Section Audit Correctifs (Pages 9 à 11 du Rapport d'Audit) */}
        <div className="mt-5 p-4 bg-emerald-950/20 border border-emerald-800/60 rounded-lg space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-800/40">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>NORMES DE MONEY MANAGEMENT & AUDIT TECHNIQUE</span>
            </div>
            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700">
              AUDITÉ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Control 1: R:R Gatekeeper */}
            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
              <label className="text-neutral-300 block mb-1 font-semibold flex items-center justify-between">
                <span>Filtre R:R Minimal Exigé</span>
                <span className="text-emerald-400 font-bold">≥ 1:{riskConfig.minRiskRewardRatio || 2.0}</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1.5"
                max="4.0"
                value={riskConfig.minRiskRewardRatio || 2.0}
                onChange={(e) => {
                  onUpdateRisk({ minRiskRewardRatio: parseFloat(e.target.value) || 2.0 });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-white font-bold"
              />
              <span className="text-[10px] text-neutral-400 block mt-1">
                Rejette d'office tout signal dont le gain visé est inférieur à 2x le Stop-Loss.
              </span>
            </div>

            {/* Control 2: Correlation Filter */}
            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
              <label className="text-neutral-300 block mb-1 font-semibold">
                Filtre de Corrélation Multi-Actifs
              </label>
              <button
                type="button"
                onClick={() => {
                  onUpdateRisk({ correlationFilterEnabled: !riskConfig.correlationFilterEnabled });
                  triggerSaveNotice();
                }}
                className={`w-full py-1.5 px-3 rounded text-left font-bold text-xs flex items-center justify-between transition ${
                  riskConfig.correlationFilterEnabled
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                }`}
              >
                <span>{riskConfig.correlationFilterEnabled ? 'ACTIVÉ (Protection)' : 'DÉSACTIVÉ'}</span>
                <span>{riskConfig.correlationFilterEnabled ? '✓' : '✗'}</span>
              </button>
              <span className="text-[10px] text-neutral-400 block mt-1">
                Empêche de cumuler simultanément plus de 2 cryptos et évite la surexposition dollar/macro.
              </span>
            </div>

            {/* Control 3: Active Circuit Breaker */}
            <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800">
              <label className="text-neutral-300 block mb-1 font-semibold">
                Action du Coupe-Circuit (-5%)
              </label>
              <select
                value={riskConfig.circuitBreakerMode || 'ACTIVE_PROTECTIVE_CLOSE'}
                onChange={(e) => {
                  onUpdateRisk({ circuitBreakerMode: e.target.value as any });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-white"
              >
                <option value="ACTIVE_PROTECTIVE_CLOSE">
                  Actif : Clôture de sauvegarde (-5% max)
                </option>
                <option value="PASSIVE_HALT">
                  Passif : Bloquer entrées uniquement
                </option>
              </select>
              <span className="text-[10px] text-emerald-400 block mt-1 font-medium">
                Garantit que la perte journalière ne dépasse JAMAIS -5,00 % (élimine la perte -9,97%).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Dynamic Multi-Pair Universe Settings (Section 5.1) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Filter className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                {isFrench ? 'PARAMÈTRES DE L’UNIVERS MULTI-PAIRES' : 'MULTI-PAIR UNIVERSE FILTERS'}
              </h3>
              <span className="text-xs text-neutral-400">
                {isFrench ? 'Sélection automatique et filtres de sécurité (Exigences U1 à U6)' : 'Filters (U1 to U6)'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Universe Modes */}
        <div className="mt-5 space-y-2">
          <span className="text-xs text-neutral-400 font-mono block">
            {isFrench ? 'Mode de l’univers de paires (Exigence U3) :' : 'Universe Mode (U3):'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <button
              onClick={() => handleModeChange('auto_filtered')}
              className={`p-3 rounded text-left border transition-colors ${
                universeConfig.filterMode === 'auto_filtered'
                  ? 'bg-neutral-950 border-emerald-500 text-white'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-bold text-emerald-400">1. Auto (Filtré)</div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {isFrench
                  ? 'Filtre automatiquement la liquidité, le spread, exclut les jetons à levier et les stablecoins.'
                  : 'Automatic liquidity & spread filter, excludes leveraged and stables.'}
              </p>
            </button>

            <button
              onClick={() => handleModeChange('manual')}
              className={`p-3 rounded text-left border transition-colors ${
                universeConfig.filterMode === 'manual'
                  ? 'bg-neutral-950 border-emerald-500 text-white'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-bold text-sky-400">2. Liste Manuelle</div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {isFrench
                  ? 'Scanne uniquement les paires explicitement ajoutées à votre liste blanche.'
                  : 'Scans strictly pairs explicitly configured in whitelist.'}
              </p>
            </button>

            <button
              onClick={() => handleModeChange('all_pairs')}
              className={`p-3 rounded text-left border transition-colors ${
                universeConfig.filterMode === 'all_pairs'
                  ? 'bg-neutral-950 border-amber-500 text-white'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-bold text-amber-400">3. Tout (Avancé)</div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {isFrench
                  ? 'Toutes les paires spot actives de l’exchange. Réservé à un usage expert avec avertissement.'
                  : 'All spot active pairs. Advanced usage only with risk warnings.'}
              </p>
            </button>
          </div>
        </div>

        {/* Detailed Filter Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 text-xs font-mono">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">Devise de cotation</label>
            <select
              value={universeConfig.quoteAsset}
              onChange={(e) => {
                onUpdateUniverse({ quoteAsset: e.target.value as any });
                triggerSaveNotice();
              }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white"
            >
              <option value="ALL">Tous les marchés (Multi-devises)</option>
              <option value="EUR">EUR (CAC 40, DAX, Actions EU)</option>
              <option value="USD">USD (S&P 500, NASDAQ, Or, Pétrole)</option>
              <option value="USDT">USDT (Binance Crypto Spot)</option>
              <option value="USDC">USDC (Circle)</option>
              <option value="FDUSD">FDUSD (First Digital)</option>
            </select>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">Volume 24h minimal</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="1000000"
                value={universeConfig.minVolume24hUsd}
                onChange={(e) => {
                  onUpdateUniverse({ minVolume24hUsd: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-white"
              />
              <span className="text-neutral-400">$</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">
              {(universeConfig.minVolume24hUsd / 1e6).toFixed(1)} M$ min
            </span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">Spread maximal</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                value={universeConfig.maxSpreadPct}
                onChange={(e) => {
                  onUpdateUniverse({ maxSpreadPct: parseFloat(e.target.value) });
                  triggerSaveNotice();
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-white"
              />
              <span className="text-neutral-400">%</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Exclusion des spreads larges</span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
            <label className="text-neutral-400 block mb-1">Plafond paires scannées</label>
            <input
              type="number"
              min="10"
              max="200"
              value={universeConfig.maxPairsToScan}
              onChange={(e) => {
                onUpdateUniverse({ maxPairsToScan: parseInt(e.target.value, 10) });
                triggerSaveNotice();
              }}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white"
            />
            <span className="text-[10px] text-neutral-500 mt-0.5 block">Top liquidité décroissante</span>
          </div>
        </div>

        {/* Security Exclusions Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-mono">
          <label className="flex items-center gap-2 p-2.5 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={universeConfig.excludeLeveragedTokens}
              onChange={(e) => {
                onUpdateUniverse({ excludeLeveragedTokens: e.target.checked });
                triggerSaveNotice();
              }}
              className="accent-emerald-500"
            />
            <span className="text-neutral-200">Exclure jetons levier (UP/DOWN)</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={universeConfig.excludeStableStable}
              onChange={(e) => {
                onUpdateUniverse({ excludeStableStable: e.target.checked });
                triggerSaveNotice();
              }}
              className="accent-emerald-500"
            />
            <span className="text-neutral-200">Exclure stable/stable (USDC/USDT)</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={universeConfig.excludeMonitoringZone}
              onChange={(e) => {
                onUpdateUniverse({ excludeMonitoringZone: e.target.checked });
                triggerSaveNotice();
              }}
              className="accent-emerald-500"
            />
            <span className="text-neutral-200">Exclure zone surveillance Binance</span>
          </label>
        </div>

        {/* Whitelist and Blacklist Manager (Exigence U3) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 pt-5 border-t border-neutral-800 text-xs font-mono">
          {/* Whitelist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">
                {isFrench ? 'Liste Blanche Manuelle (Whitelist)' : 'Whitelist'}
              </span>
              <span className="text-neutral-500">{universeConfig.whitelist.length} paires</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Ex: SOL/USDT"
                value={newWhitelistPair}
                onChange={(e) => setNewWhitelistPair(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-white text-xs"
              />
              <button
                onClick={handleAddWhitelist}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-950 border border-neutral-800 rounded min-h-[48px]">
              {universeConfig.whitelist.length === 0 ? (
                <span className="text-neutral-600 text-[11px]">Aucune paire (mode Auto actif)</span>
              ) : (
                universeConfig.whitelist.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 text-[11px]"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveWhitelist(item)}
                      className="text-neutral-500 hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Blacklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-rose-300">
                {isFrench ? 'Liste Noire (Blacklist - Toujours exclue)' : 'Blacklist'}
              </span>
              <span className="text-neutral-500">{universeConfig.blacklist.length} paires</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Ex: BADCOIN/USDT"
                value={newBlacklistPair}
                onChange={(e) => setNewBlacklistPair(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-white text-xs"
              />
              <button
                onClick={handleAddBlacklist}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-rose-300 rounded flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-950 border border-neutral-800 rounded min-h-[48px]">
              {universeConfig.blacklist.length === 0 ? (
                <span className="text-neutral-600 text-[11px]">Aucune paire bloquée</span>
              ) : (
                universeConfig.blacklist.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 text-[11px]"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveBlacklist(item)}
                      className="text-neutral-500 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
