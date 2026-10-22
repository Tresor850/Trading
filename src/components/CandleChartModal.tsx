import React from 'react';
import { MarketPair } from '../types/trading';
import { X, TrendingUp, AlertTriangle } from 'lucide-react';

interface CandleChartModalProps {
  pair: MarketPair | null;
  onClose: () => void;
  lang: 'fr' | 'en';
}

export const CandleChartModal: React.FC<CandleChartModalProps> = ({ pair, onClose, lang }) => {
  if (!pair) return null;
  const isFrench = lang === 'fr';

  const candles = pair.candles;
  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const priceRange = maxPrice - minPrice || 1;

  const svgWidth = 720;
  const svgHeight = 260;
  const candleWidth = Math.max(3, Math.floor((svgWidth - 40) / candles.length) - 3);

  const getY = (val: number) => {
    return svgHeight - 20 - ((val - minPrice) / priceRange) * (svgHeight - 40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-4xl w-full p-6 text-neutral-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold font-mono text-white">{pair.symbol}</span>
              <span
                className={`text-sm font-mono font-medium ${
                  pair.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pair.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} {pair.quoteAsset === 'EUR' ? '€' : pair.quoteAsset === 'USD' ? '$' : 'USDT'} (
                {pair.change24h >= 0 ? '+' : ''}
                {pair.change24h}%)
              </span>
              <span className="text-xs text-neutral-400 font-mono">Timeframe 1h</span>
            </div>
            {pair.name && (
              <span className="text-xs text-neutral-400 font-mono mt-0.5 block">
                {pair.name}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Indicators Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono">
          <div>
            <span className="text-neutral-500 block">EMA 9 :</span>
            <span className="text-emerald-400 font-semibold">{pair.ema9.toFixed(pair.price < 1 ? 4 : 2)}</span>
          </div>
          <div>
            <span className="text-neutral-500 block">EMA 21 :</span>
            <span className="text-amber-400 font-semibold">{pair.ema21.toFixed(pair.price < 1 ? 4 : 2)}</span>
          </div>
          <div>
            <span className="text-neutral-500 block">RSI 14 :</span>
            <span
              className={`font-semibold ${
                pair.rsi14 >= 70
                  ? 'text-rose-400'
                  : pair.rsi14 <= 30
                  ? 'text-cyan-400'
                  : 'text-neutral-200'
              }`}
            >
              {pair.rsi14}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">ATR 14 :</span>
            <span className="text-neutral-200 font-semibold">{pair.atr14.toFixed(pair.price < 1 ? 4 : 2)}</span>
          </div>
        </div>

        {/* SVG Candle Chart */}
        <div className="bg-neutral-950 border border-neutral-800 rounded p-3 relative overflow-hidden">
          <div className="absolute top-3 left-4 flex items-center gap-4 text-[11px] font-mono text-neutral-400 z-10">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400"></span>
              EMA 9
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400"></span>
              EMA 21
            </span>
            <span className="text-neutral-500">
              Min: {minPrice.toFixed(pair.price < 1 ? 4 : 2)} | Max: {maxPrice.toFixed(pair.price < 1 ? 4 : 2)}
            </span>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-64 select-none"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
              const y = svgHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1="20"
                  y1={y}
                  x2={svgWidth - 20}
                  y2={y}
                  stroke="#262626"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Candlesticks */}
            {candles.map((c, i) => {
              const x = 30 + i * ((svgWidth - 60) / candles.length);
              const isGreen = c.close >= c.open;
              const yHigh = getY(c.high);
              const yLow = getY(c.low);
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

              return (
                <g key={c.timestamp} className="opacity-90 hover:opacity-100">
                  {/* Wick */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={yHigh}
                    x2={x + candleWidth / 2}
                    y2={yLow}
                    stroke={isGreen ? '#22c55e' : '#f43f5e'}
                    strokeWidth="1.5"
                  />
                  {/* Body */}
                  <rect
                    x={x}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isGreen ? '#22c55e' : '#f43f5e'}
                    rx="1"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Strategy Signal Interpretation */}
        <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-neutral-300">
              {pair.ema9 > pair.ema21
                ? 'Croisement haussier actif (EMA 9 > EMA 21)'
                : 'Croisement baissier (EMA 9 < EMA 21)'}
            </span>
          </div>

          <div className="text-neutral-400 font-mono">
            {pair.activeSignal === 'BUY_SIGNAL' ? (
              <span className="text-emerald-400 font-semibold">SIGNAL D’ACHAT VALIDE</span>
            ) : pair.activeSignal === 'OVERBOUGHT' ? (
              <span className="text-rose-400">RSI &gt; 70 (SURACHAT - ACHAT BLOQUÉ)</span>
            ) : (
              <span>AUCUN SIGNAL (ATTENTE CLÔTURE)</span>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 text-neutral-200 text-xs font-mono rounded hover:bg-neutral-700"
          >
            {isFrench ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
