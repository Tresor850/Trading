import React, { useState, useMemo } from 'react';
import { MarketPair, UniverseConfig, Position } from '../types/trading';
import { evaluatePairFilters } from '../services/tradingEngine';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface ScannerTabProps {
  pairs: MarketPair[];
  positions: Position[];
  universeConfig: UniverseConfig;
  onTogglePairEnabled: (symbol: string) => void;
  onSelectPairForChart: (pair: MarketPair) => void;
  lang: 'fr' | 'en';
}

export const ScannerTab: React.FC<ScannerTabProps> = ({
  pairs,
  positions,
  universeConfig,
  onTogglePairEnabled,
  onSelectPairForChart,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'signals' | 'in_position' | 'filtered'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'index' | 'crypto' | 'commodity' | 'forex' | 'stock'>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'change' | 'spread' | 'rsi'>('volume');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const openPositionSymbols = useMemo(() => {
    return new Set(positions.map((p) => p.symbol));
  }, [positions]);

  // Compute evaluation for all pairs
  const evaluatedPairs = useMemo(() => {
    return pairs.map((pair) => {
      const evaluation = evaluatePairFilters(pair, universeConfig);
      const isInPosition = openPositionSymbols.has(pair.symbol);
      return {
        ...pair,
        isEligible: evaluation.isEligible,
        filterReason: evaluation.reason,
        isInPosition,
      };
    });
  }, [pairs, universeConfig, openPositionSymbols]);

  // Filtered & sorted pairs
  const filteredPairs = useMemo(() => {
    return evaluatedPairs
      .filter((p) => {
        // Search query
        if (
          searchQuery &&
          !p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.baseAsset.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        ) {
          return false;
        }

        // Category filter (CAC 40, Indices, Crypto, Commodities, Forex, Stocks)
        if (categoryFilter !== 'all' && p.assetCategory !== categoryFilter) {
          return false;
        }

        // Status filter
        if (statusFilter === 'eligible') return p.isEligible;
        if (statusFilter === 'signals') return p.activeSignal === 'BUY_SIGNAL' && p.isEligible;
        if (statusFilter === 'in_position') return p.isInPosition;
        if (statusFilter === 'filtered') return !p.isEligible;

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'volume') diff = b.volume24h - a.volume24h;
        else if (sortBy === 'change') diff = b.change24h - a.change24h;
        else if (sortBy === 'spread') diff = a.spreadPct - b.spreadPct;
        else if (sortBy === 'rsi') diff = b.rsi14 - a.rsi14;

        return sortOrder === 'desc' ? diff : -diff;
      });
  }, [evaluatedPairs, searchQuery, categoryFilter, statusFilter, sortBy, sortOrder]);

  const totalEligible = evaluatedPairs.filter((p) => p.isEligible).length;
  const totalSignals = evaluatedPairs.filter((p) => p.activeSignal === 'BUY_SIGNAL' && p.isEligible).length;
  const indicesCount = evaluatedPairs.filter((p) => p.assetCategory === 'index').length;
  const cryptoCount = evaluatedPairs.filter((p) => p.assetCategory === 'crypto').length;
  const commoditiesCount = evaluatedPairs.filter((p) => p.assetCategory === 'commodity').length;
  const forexCount = evaluatedPairs.filter((p) => p.assetCategory === 'forex').length;
  const stocksCount = evaluatedPairs.filter((p) => p.assetCategory === 'stock').length;

  return (
    <div className="space-y-6">
      {/* Bot Supervisor Hero Strip - Ensures the user always sees their Trading Bot */}
      <div className="p-4 bg-neutral-900 border border-emerald-800/60 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-950 border border-emerald-800 rounded text-emerald-400 mt-0.5">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400">
                BOT DE TRADING INTÉGRÉ · SUPERVISEUR MULTI-MARCHÉS
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h2 className="text-sm font-bold text-white font-mono mt-0.5">
              Stratégie EMA 9 / EMA 21 + Filtre RSI 14 (Timeframe 1h)
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Analyse automatique continue des <strong>Indices (CAC 40, DAX, S&P 500)</strong>, des <strong>Matières Premières (Or, Pétrole)</strong>, du <strong>Forex</strong> et de <strong>Binance Crypto Spot</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-neutral-300">
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block text-[10px]">Actifs surveillés</span>
            <span className="text-white font-bold">{pairs.length} marchés</span>
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block text-[10px]">Signaux Actifs</span>
            <span className="text-emerald-400 font-bold">{totalSignals} signaux BUY</span>
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block text-[10px]">Positions bot</span>
            <span className="text-amber-400 font-bold">{positions.length} / 5</span>
          </div>
        </div>
      </div>

      {/* Market Category Segmented Control (CAC40, Indices, Crypto, Commodities, Forex, Stocks) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
        <span className="text-neutral-500 whitespace-nowrap mr-2 text-[11px]">Marchés :</span>
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'all'
              ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <span>Tous les Marchés</span>
          <span className="text-[10px] text-neutral-500">({pairs.length})</span>
        </button>

        <button
          onClick={() => setCategoryFilter('index')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'index'
              ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <span>Indices (CAC 40, DAX, S&P 500)</span>
          <span className="text-[10px] text-emerald-400 font-bold">({indicesCount})</span>
        </button>

        <button
          onClick={() => setCategoryFilter('crypto')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'crypto'
              ? 'bg-neutral-800 text-sky-400 font-semibold border border-sky-800'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <span>Crypto Spot (Binance)</span>
          <span className="text-[10px] text-neutral-500">({cryptoCount})</span>
        </button>

        <button
          onClick={() => setCategoryFilter('commodity')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'commodity'
              ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-700'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <span>Matières Premières (Or, Pétrole)</span>
          <span className="text-[10px] text-amber-400">({commoditiesCount})</span>
        </button>

        <button
          onClick={() => setCategoryFilter('forex')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'forex'
              ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <span>Forex (EUR/USD, USD/EUR, GBP)</span>
          <span className="text-[10px] text-neutral-500">({forexCount})</span>
        </button>

        <button
          onClick={() => setCategoryFilter('stock')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            categoryFilter === 'stock'
              ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          <span>Actions (LVMH, Total, Apple)</span>
          <span className="text-[10px] text-neutral-500">({stocksCount})</span>
        </button>
      </div>

      {/* Overview search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <div>
          <span className="text-xs text-neutral-400 font-mono block">
            {isFrench ? 'RÉSULTATS DE SCAN EN TEMPS RÉEL' : 'REAL-TIME SCAN RESULTS'}
          </span>
          <div className="text-sm font-semibold text-white mt-0.5">
            {filteredPairs.length} {isFrench ? 'actifs affichés' : 'assets displayed'} ·{' '}
            <span className="text-emerald-400 font-mono">{filteredPairs.filter(p => p.isEligible).length} {isFrench ? 'éligibles' : 'eligible'}</span> ·{' '}
            <span className="text-sky-400 font-mono">{filteredPairs.filter(p => p.activeSignal === 'BUY_SIGNAL').length} {isFrench ? 'signaux d’achat' : 'buy signals'}</span>
          </div>
        </div>

        {/* Search input and quick chips */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFrench ? 'Rechercher (CAC40, BTC, Or, Total, ...)' : 'Search (CAC40, BTC, Gold, ...)'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick-Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
            <span className="text-neutral-500 text-[10px]">Accès direct :</span>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSearchQuery('CAC40');
              }}
              className={`px-2 py-0.5 rounded transition-colors ${
                searchQuery === 'CAC40'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold'
                  : 'bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800'
              }`}
            >
              ⭐ CAC 40
            </button>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSearchQuery('DAX');
              }}
              className="px-2 py-0.5 bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800 rounded transition-colors"
            >
              DAX 40
            </button>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSearchQuery('SPX');
              }}
              className="px-2 py-0.5 bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800 rounded transition-colors"
            >
              S&P 500
            </button>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSearchQuery('XAU');
              }}
              className="px-2 py-0.5 bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800 rounded transition-colors"
            >
              🥇 Or Spot
            </button>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSearchQuery('BTC');
              }}
              className="px-2 py-0.5 bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800 rounded transition-colors"
            >
              🪙 BTC
            </button>
            <button
              onClick={() => {
                setCategoryFilter('stock');
                setSearchQuery('');
              }}
              className="px-2 py-0.5 bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800 rounded transition-colors"
            >
              🇫🇷 Actions CAC 40
            </button>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-1.5 py-0.5 text-neutral-400 hover:text-rose-400 text-[10px]"
              >
                ✕ Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Segmented Control & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Status filters */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-neutral-800 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isFrench ? 'Toutes' : 'All'} ({pairs.length})
          </button>
          <button
            onClick={() => setStatusFilter('eligible')}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              statusFilter === 'eligible'
                ? 'bg-neutral-800 text-emerald-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isFrench ? 'Éligibles' : 'Eligible'} ({totalEligible})
          </button>
          <button
            onClick={() => setStatusFilter('signals')}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              statusFilter === 'signals'
                ? 'bg-sky-950 text-sky-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isFrench ? 'Signaux BUY' : 'Signals'} ({totalSignals})
          </button>
          <button
            onClick={() => setStatusFilter('in_position')}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              statusFilter === 'in_position'
                ? 'bg-neutral-800 text-amber-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isFrench ? 'En Position' : 'In Position'} ({positions.length})
          </button>
          <button
            onClick={() => setStatusFilter('filtered')}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap ${
              statusFilter === 'filtered'
                ? 'bg-neutral-800 text-rose-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isFrench ? 'Exclues' : 'Excluded'} ({pairs.length - totalEligible})
          </button>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">{isFrench ? 'Trier par :' : 'Sort by:'}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded px-2.5 py-1 text-xs font-mono focus:outline-none"
          >
            <option value="volume">{isFrench ? 'Liquidité / Volume 24h' : '24h Volume'}</option>
            <option value="change">{isFrench ? 'Variation 24h' : '24h Change'}</option>
            <option value="spread">{isFrench ? 'Spread le plus serré' : 'Tightest Spread'}</option>
            <option value="rsi">RSI 14</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded hover:bg-neutral-800"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Main Pairs Grid Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3 font-medium">Actif / Marché</th>
                <th className="px-4 py-3 font-medium">Prix & Devise</th>
                <th className="px-4 py-3 font-medium">Var 24h</th>
                <th className="px-4 py-3 font-medium">Volume 24h</th>
                <th className="px-4 py-3 font-medium">Spread</th>
                <th className="px-4 py-3 font-medium">EMA 9 / 21</th>
                <th className="px-4 py-3 font-medium">RSI 14</th>
                <th className="px-4 py-3 font-medium">Signal Stratégie</th>
                <th className="px-4 py-3 font-medium">Filtre Sécurité</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredPairs.map((pair) => {
                const isBuySignal = pair.activeSignal === 'BUY_SIGNAL' && pair.isEligible;
                const isOverbought = pair.rsi14 >= 70;
                const isEmaBullish = pair.ema9 > pair.ema21;
                const currencyUnit = pair.quoteAsset === 'EUR' ? '€' : pair.quoteAsset === 'USD' ? '$' : 'USDT';

                return (
                  <tr
                    key={pair.symbol}
                    className={`hover:bg-neutral-800/50 transition-colors ${
                      pair.isInPosition ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Pair symbol and descriptive name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{pair.symbol}</span>
                        {pair.assetCategory === 'index' && (
                          <span className="text-[10px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
                            INDICE
                          </span>
                        )}
                        {pair.assetCategory === 'commodity' && (
                          <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 font-bold">
                            MÉTAL/PÉTROLE
                          </span>
                        )}
                        {pair.assetCategory === 'stock' && (
                          <span className="text-[10px] text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800 font-bold">
                            ACTION
                          </span>
                        )}
                        {pair.assetCategory === 'forex' && (
                          <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800 font-bold">
                            FOREX
                          </span>
                        )}
                        {pair.isInPosition && (
                          <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60 font-semibold">
                            {isFrench ? 'EN POSITION' : 'IN POSITION'}
                          </span>
                        )}
                      </div>
                      {pair.name && (
                        <span className="text-[11px] text-neutral-400 block font-normal">
                          {pair.name}
                        </span>
                      )}
                    </td>

                    {/* Price with real currency */}
                    <td className="px-4 py-3 tabular-nums font-semibold text-neutral-100">
                      {pair.price.toLocaleString(undefined, {
                        minimumFractionDigits: pair.price < 1 ? 4 : 2,
                        maximumFractionDigits: pair.price < 1 ? 5 : 2,
                      })}{' '}
                      <span className="text-xs font-normal text-neutral-400">{currencyUnit}</span>
                    </td>

                    {/* Change 24h */}
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          pair.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pair.change24h >= 0 ? '+' : ''}
                        {pair.change24h}%
                      </span>
                    </td>

                    {/* Volume 24h */}
                    <td className="px-4 py-3 tabular-nums text-neutral-300">
                      ${(pair.volume24h / 1e6).toFixed(1)}M
                    </td>

                    {/* Spread */}
                    <td className="px-4 py-3 tabular-nums text-neutral-400">
                      {pair.spreadPct.toFixed(2)}%
                    </td>

                    {/* EMA 9 / 21 */}
                    <td className="px-4 py-3 tabular-nums">
                      <span className={isEmaBullish ? 'text-emerald-400 font-semibold' : 'text-neutral-400'}>
                        {pair.ema9.toFixed(pair.price < 1 ? 3 : 1)}
                      </span>
                      <span className="text-neutral-600"> / </span>
                      <span className="text-neutral-400">
                        {pair.ema21.toFixed(pair.price < 1 ? 3 : 1)}
                      </span>
                    </td>

                    {/* RSI 14 */}
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={`font-semibold ${
                          isOverbought
                            ? 'text-rose-400'
                            : pair.rsi14 <= 30
                            ? 'text-cyan-400'
                            : 'text-neutral-200'
                        }`}
                      >
                        {pair.rsi14}
                      </span>
                    </td>

                    {/* Active Signal */}
                    <td className="px-4 py-3">
                      {isBuySignal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700 animate-pulse">
                          <TrendingUp className="w-3 h-3" />
                          <span>SIGNAL ACHAT</span>
                        </span>
                      ) : isOverbought ? (
                        <span className="text-[10px] text-rose-400">RSI &gt; 70 Bloqué</span>
                      ) : (
                        <span className="text-[10px] text-neutral-500">Neutre</span>
                      )}
                    </td>

                    {/* Security Filter Status */}
                    <td className="px-4 py-3">
                      {pair.isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{isFrench ? 'Éligible' : 'Eligible'}</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-rose-400"
                          title={pair.filterReason}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[140px]">{pair.filterReason}</span>
                        </span>
                      )}
                    </td>

                    {/* Actions: Enable Toggle & Candlestick Modal */}
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectPairForChart(pair)}
                          title={isFrench ? 'Voir le graphique chandelier 1h' : 'View 1h candle chart'}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onTogglePairEnabled(pair.symbol)}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                            pair.isEnabled
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-neutral-800 text-neutral-500'
                          }`}
                        >
                          {pair.isEnabled ? (isFrench ? 'Active' : 'ON') : isFrench ? 'Désact.' : 'OFF'}
                        </button>
                      </div>
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
