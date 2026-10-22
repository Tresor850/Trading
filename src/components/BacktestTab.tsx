import React, { useState } from 'react';
import {
  PortfolioRiskConfig,
  UniverseConfig,
  BacktestResult,
} from '../types/trading';
import { runPortfolioBacktest } from '../services/backtestEngine';
import {
  BarChart3,
  Play,
  Download,
  AlertTriangle,
  TrendingUp,
  Percent,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface BacktestTabProps {
  riskConfig: PortfolioRiskConfig;
  universeConfig: UniverseConfig;
  lang: 'fr' | 'en';
}

export const BacktestTab: React.FC<BacktestTabProps> = ({
  riskConfig,
  universeConfig,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const [daysBack, setDaysBack] = useState<number>(60);
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult>(() =>
    runPortfolioBacktest(riskConfig, universeConfig, 10000, 60)
  );

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runPortfolioBacktest(riskConfig, universeConfig, initialCapital, daysBack);
      setResult(res);
      setIsRunning(false);
    }, 400);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Paire', 'Cote', 'Entree', 'Sortie', 'Quantite', 'PnL_USD', 'PnL_Pct', 'Frais_USD', 'Raison_Sortie'];
    const rows = result.trades.map((t) => [
      t.id,
      t.symbol,
      t.side,
      t.entryPrice,
      t.exitPrice.toFixed(4),
      t.quantity,
      t.pnlUsd,
      t.pnlPct,
      t.feesUsd,
      t.exitReason,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tradng_bot_backtest_${daysBack}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Equity curve calculation
  const curve = result.equityCurve;
  const minEquity = Math.min(...curve.map((c) => c.equity)) * 0.98;
  const maxEquity = Math.max(...curve.map((c) => c.equity)) * 1.02;
  const svgWidth = 800;
  const svgHeight = 220;

  const points = curve
    .map((pt, i) => {
      const x = 30 + (i / (curve.length - 1 || 1)) * (svgWidth - 60);
      const y = svgHeight - 20 - ((pt.equity - minEquity) / (maxEquity - minEquity || 1)) * (svgHeight - 40);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Over-optimization Mandatory Warning (Requirement B4) */}
      <div className="p-4 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-200 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold font-mono text-white">
            {isFrench
              ? 'AVERTISSEMENT LÉGAL SUR LE RISQUE DE SUR-OPTIMISATION (EXIGENCE B4)'
              : 'OVER-OPTIMIZATION & PAST PERFORMANCE WARNING (B4)'}
          </div>
          <p className="mt-1">
            {isFrench
              ? 'Les performances passées ne préjugent en rien des performances futures. Ajuster des paramètres spécifiques pour maximiser les gains passés (curve-fitting) conduit généralement à des pertes en conditions de marché réelles. Testez toujours la robustesse sur une période de démo prolongée.'
              : 'Past returns do not guarantee future results. Overfitting parameters leads to live losses. Always validate in demo mode.'}
          </p>
        </div>
      </div>

      {/* Backtest Parameters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="flex items-center gap-4 flex-wrap text-xs font-mono">
          <div>
            <span className="text-neutral-400 block mb-1">Période d’historique</span>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(parseInt(e.target.value, 10))}
              className="bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-white"
            >
              <option value="30">30 jours (Court terme)</option>
              <option value="60">60 jours (Standard recommandé)</option>
              <option value="90">90 jours (Cycle de marché complet)</option>
            </select>
          </div>

          <div>
            <span className="text-neutral-400 block mb-1">Capital initial simulé</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="1000"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white w-28"
              />
              <span className="text-neutral-400">USDT</span>
            </div>
          </div>

          <div className="text-neutral-500 text-[11px] pt-4">
            Règles appliquées : 5 pos. max, sizing 2% risque, frais 0.1%, circuit breaker 5%
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-medium transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isFrench ? 'Lancer le backtest' : 'Run Backtest'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-mono border border-neutral-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isFrench ? 'Exporter CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Backtest KPI Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded">
          <span className="text-[11px] font-mono text-neutral-400 block">Rendement Net</span>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
            +{result.netProfitPct}%
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            +${result.netProfitUsd.toFixed(0)} USDT
          </span>
        </div>

        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded">
          <span className="text-[11px] font-mono text-neutral-400 block">Profit Factor</span>
          <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
            {result.profitFactor}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            {result.profitFactor > 1.3 ? 'Excellent (>1.3)' : 'Acceptable'}
          </span>
        </div>

        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded">
          <span className="text-[11px] font-mono text-neutral-400 block">Max Drawdown</span>
          <div className="text-lg font-bold font-mono tabular-nums text-rose-400 mt-0.5">
            -{result.maxDrawdownPct}%
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            -${result.maxDrawdownUsd.toFixed(0)} creux max
          </span>
        </div>

        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded">
          <span className="text-[11px] font-mono text-neutral-400 block">Taux de Gain (Win Rate)</span>
          <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
            {result.winRatePct}%
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            {result.winningTrades} / {result.totalTrades} trades
          </span>
        </div>

        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded">
          <span className="text-[11px] font-mono text-neutral-400 block">Ratio de Sharpe</span>
          <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
            {result.sharpeRatio}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Annualisé (Sans risque 3%)</span>
        </div>

        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded">
          <span className="text-[11px] font-mono text-neutral-400 block">Frais Totaux Payés</span>
          <div className="text-lg font-bold font-mono tabular-nums text-neutral-300 mt-0.5">
            ${result.totalFeesPaidUsd.toFixed(0)}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Frais 0.1% spot ccxt</span>
        </div>
      </div>

      {/* SVG Equity Curve Chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white">
              {isFrench ? 'COURBE D’ÉQUITÉ DU PORTEFEUILLE' : 'PORTFOLIO EQUITY CURVE'}
            </h3>
          </div>
          <div className="text-neutral-400">
            {result.startDate} → {result.endDate} ({curve.length} points)
          </div>
        </div>

        <div className="pt-4 overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-56 select-none"
            preserveAspectRatio="none"
          >
            {/* Grid */}
            {[0.25, 0.5, 0.75].map((r) => {
              const y = svgHeight * r;
              return (
                <line
                  key={r}
                  x1="30"
                  y1={y}
                  x2={svgWidth - 30}
                  y2={y}
                  stroke="#262626"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Benchmark start line */}
            <line
              x1="30"
              y1={svgHeight - 20 - ((initialCapital - minEquity) / (maxEquity - minEquity || 1)) * (svgHeight - 40)}
              x2={svgWidth - 30}
              y2={svgHeight - 20 - ((initialCapital - minEquity) / (maxEquity - minEquity || 1)) * (svgHeight - 40)}
              stroke="#525252"
              strokeDasharray="4 4"
            />

            {/* Polygon Gradient Area under curve */}
            <polygon
              points={`30,${svgHeight - 20} ${points} ${svgWidth - 30},${svgHeight - 20}`}
              fill="rgba(16, 185, 129, 0.1)"
            />

            {/* Curve Line */}
            <polyline
              points={points}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Breakdown per pair (Requirement B2) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800">
          <h3 className="text-sm font-bold font-mono text-white">
            {isFrench
              ? 'QUALIFICATION ET RÉSULTATS PAR PAIRE (EXIGENCE B2 & B3)'
              : 'PERFORMANCE BREAKDOWN BY PAIR'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-3 font-medium">Paire Spot</th>
                <th className="px-4 py-3 font-medium">Trades Exécutés</th>
                <th className="px-4 py-3 font-medium">Win Rate</th>
                <th className="px-4 py-3 font-medium">Profit Factor</th>
                <th className="px-4 py-3 font-medium">Statut Qualification</th>
                <th className="px-6 py-3 font-medium text-right">P&L Net Généré</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {result.pairBreakdown.map((p) => {
                const isProfitable = p.pnlUsd >= 0;
                const isQualified = p.winRate >= 55 && p.profitFactor >= 1.3;

                return (
                  <tr key={p.symbol} className="hover:bg-neutral-800/50">
                    <td className="px-6 py-3 font-bold text-white flex items-center gap-2">
                      <span>{p.symbol}</span>
                      {p.symbol.includes('CAC40') && (
                        <span className="text-[10px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                          INDICE PARIS
                        </span>
                      )}
                      {p.symbol.includes('SPX') && (
                        <span className="text-[10px] text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800 font-bold">
                          WALL STREET
                        </span>
                      )}
                      {p.symbol.includes('XAU') && (
                        <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 font-bold">
                          OR SPOT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-300">{p.tradesCount}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-200">{p.winRate}%</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-200">{p.profitFactor}</td>
                    <td className="px-4 py-3">
                      {isQualified ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                          QUALIFIÉE POUR RÉEL
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                          OBSERVATION REQUISE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-bold">
                      <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                        {isProfitable ? '+' : ''}${p.pnlUsd.toFixed(2)} USDT
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
