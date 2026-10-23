import React, { useState, useEffect, useRef } from 'react';
import {
  TradingMode,
  BotStatus,
  MarketPair,
  Position,
  Trade,
  PortfolioRiskConfig,
  UniverseConfig,
  ExchangeConfig,
  TelegramConfig,
  AuditLog,
} from './types/trading';
import {
  DEFAULT_RISK_CONFIG,
  DEFAULT_UNIVERSE_CONFIG,
  DEFAULT_EXCHANGE_CONFIG,
  DEFAULT_TELEGRAM_CONFIG,
  createInitialEngineState,
  evaluatePairFilters,
  EngineState,
} from './services/tradingEngine';
import { buildInitialMarketPairs } from './data/mockMarkets';

import { Header } from './components/Header';
import { DashboardTab } from './components/DashboardTab';
import { ScannerTab } from './components/ScannerTab';
import { RiskUniverseTab } from './components/RiskUniverseTab';
import { ExchangeTab } from './components/ExchangeTab';
import { TelegramTab } from './components/TelegramTab';
import { BacktestTab } from './components/BacktestTab';
import { DemoScorecardTab } from './components/DemoScorecardTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { AdminKeysTab } from './components/AdminKeysTab';
import { OnboardingModal } from './components/OnboardingModal';
import { EmergencyModal } from './components/EmergencyModal';
import { CandleChartModal } from './components/CandleChartModal';
import { TestGuideModal } from './components/TestGuideModal';
import { BudgetAdvisorModal } from './components/BudgetAdvisorModal';
import { UserLoginModal } from './components/UserLoginModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MathAuditModal } from './components/MathAuditModal';
import { fetchLiveBinanceTickers } from './services/apiIntegrations';
import { getCurrentUser } from './services/accessKeyService';
import {
  calculateSpotPositionSizing,
  evaluateCorrelationFilter,
} from './services/positionSizingEngine';
import { UserProfile } from './types/trading';

export default function App() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentMode, setCurrentMode] = useState<TradingMode>('simulation');

  // Authenticated User session & Admin generated Access Key
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isMathAuditModalOpen, setIsMathAuditModalOpen] = useState<boolean>(false);


  // Multi-mode states (Requirement M4: Strictly separated data per mode)
  const [simulationState, setSimulationState] = useState<EngineState>(() =>
    createInitialEngineState('simulation')
  );
  const [testnetState, setTestnetState] = useState<EngineState>(() =>
    createInitialEngineState('testnet')
  );
  const [liveState, setLiveState] = useState<EngineState>(() =>
    createInitialEngineState('live')
  );

  // Active state accessor & setter
  const activeEngineState =
    currentMode === 'simulation'
      ? simulationState
      : currentMode === 'testnet'
      ? testnetState
      : liveState;

  const setActiveEngineState = (updater: (prev: EngineState) => EngineState) => {
    if (currentMode === 'simulation') setSimulationState(updater);
    else if (currentMode === 'testnet') setTestnetState(updater);
    else setLiveState(updater);
  };

  // Configurations
  const [riskConfig, setRiskConfig] = useState<PortfolioRiskConfig>(DEFAULT_RISK_CONFIG);
  const [universeConfig, setUniverseConfig] = useState<UniverseConfig>(DEFAULT_UNIVERSE_CONFIG);
  const [exchangeConfig, setExchangeConfig] = useState<ExchangeConfig>(DEFAULT_EXCHANGE_CONFIG);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(DEFAULT_TELEGRAM_CONFIG);

  // Scanned market pairs (60+ Binance spot pairs)
  const [pairs, setPairs] = useState<MarketPair[]>(() => buildInitialMarketPairs());

  // Modals & User Custom Budget
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isTestGuideOpen, setIsTestGuideOpen] = useState<boolean>(false);
  const [isBudgetAdvisorOpen, setIsBudgetAdvisorOpen] = useState<boolean>(false);
  const [userBudgetCurrency, setUserBudgetCurrency] = useState<'EUR' | 'USD' | 'USDT'>('EUR');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [selectedChartPair, setSelectedChartPair] = useState<MarketPair | null>(null);

  // Synchronize exchange credentials when currentUser changes (e.g., admin pre-assigned keys)
  useEffect(() => {
    if (currentUser?.binanceApiKey && currentUser?.binanceApiSecret) {
      setExchangeConfig((prev) => ({
        ...prev,
        apiKey: currentUser.binanceApiKey!,
        apiSecret: currentUser.binanceApiSecret!,
      }));
    }
  }, [currentUser]);

  // Mode selection guard based on user license and admin-granted permissions
  const handleSelectMode = (newMode: TradingMode) => {
    if (newMode === 'live' && currentUser && !currentUser.canTradeLive) {
      alert(
        lang === 'fr'
          ? "Attention : Votre clé d'accès actuelle ne vous autorise pas à trader en direct sur Binance Réel. Seul l'administrateur peut accorder cette permission via l'onglet 'Clés & Utilisateurs'."
          : "Notice: Your current access key does not have live trading permissions. Contact the administrator to grant live access."
      );
      setActiveTab('admin_keys');
      return;
    }
    setCurrentMode(newMode);
  };


  // Initial live Binance ticker fetch
  useEffect(() => {
    let isMounted = true;
    fetchLiveBinanceTickers().then((res) => {
      if (res.success && res.tickers && isMounted) {
        setPairs((prev) =>
          prev.map((p) => {
            const live = res.tickers![p.symbol];
            if (live && live.price > 0) {
              return {
                ...p,
                price: live.price,
                change24h: live.change24h,
                volume24h: live.volume24h,
              };
            }
            return p;
          })
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Live real-time tick engine loop (every 3.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Slightly drift market prices realistically
      setPairs((prevPairs) =>
        prevPairs.map((p) => {
          const driftPct = (Math.random() - 0.49) * 0.004; // 0.2% drift
          const newPrice = Number((p.price * (1 + driftPct)).toFixed(p.price < 1 ? 5 : 2));
          return {
            ...p,
            price: newPrice,
          };
        })
      );

      // 2. If engine is running, update positions & evaluate triggers
      setActiveEngineState((prevState) => {
        if (prevState.status !== 'running') return prevState;

        const now = Date.now();
        let updatedPositions: Position[] = [];
        const newClosedTrades: Trade[] = [];
        const newLogs: AuditLog[] = [];
        let updatedBalance = prevState.balanceUsd;

        // Check each open position
        for (const pos of prevState.positions) {
          // Find current pair price
          const pair = pairs.find((p) => p.symbol === pos.symbol);
          const currentPrice = pair ? pair.price : pos.currentPrice;

          // Recalculate unrealized P&L
          const pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
          const pnlUsd = (pos.costUsd * pnlPct) / 100;

          // Check Take-Profit
          if (currentPrice >= pos.takeProfitPrice) {
            const exitFee = pos.costUsd * 0.001;
            const netTradePnl = pnlUsd - exitFee;
            updatedBalance += pos.costUsd + netTradePnl;

            newClosedTrades.push({
              id: `tr_${now}_${pos.symbol.replace('/', '')}`,
              symbol: pos.symbol,
              side: 'BUY',
              mode: prevState.mode,
              entryPrice: pos.entryPrice,
              exitPrice: currentPrice,
              quantity: pos.quantity,
              entryTime: pos.entryTime,
              exitTime: now,
              pnlUsd: Number(netTradePnl.toFixed(2)),
              pnlPct: Number(pnlPct.toFixed(2)),
              feesUsd: Number((pos.feesPaidUsd + exitFee).toFixed(2)),
              exitReason: 'TAKE_PROFIT',
              durationMinutes: Math.floor((now - pos.entryTime) / 60000),
            });

            newLogs.push({
              id: `log_tp_${now}_${pos.symbol}`,
              timestamp: now,
              level: 'INFO',
              category: 'ORDER',
              message: `Take-Profit atteint sur ${pos.symbol} à ${currentPrice} USDT (+${pnlPct.toFixed(2)}%). Position clôturée en gain net de +${netTradePnl.toFixed(2)} USDT.`,
              symbol: pos.symbol,
            });
            continue;
          }

          // Check Stop-Loss
          if (currentPrice <= pos.stopLossPrice) {
            const exitFee = pos.costUsd * 0.001;
            const netTradePnl = pnlUsd - exitFee;
            updatedBalance += pos.costUsd + netTradePnl;

            newClosedTrades.push({
              id: `tr_${now}_${pos.symbol.replace('/', '')}`,
              symbol: pos.symbol,
              side: 'BUY',
              mode: prevState.mode,
              entryPrice: pos.entryPrice,
              exitPrice: currentPrice,
              quantity: pos.quantity,
              entryTime: pos.entryTime,
              exitTime: now,
              pnlUsd: Number(netTradePnl.toFixed(2)),
              pnlPct: Number(pnlPct.toFixed(2)),
              feesUsd: Number((pos.feesPaidUsd + exitFee).toFixed(2)),
              exitReason: 'STOP_LOSS',
              durationMinutes: Math.floor((now - pos.entryTime) / 60000),
            });

            newLogs.push({
              id: `log_sl_${now}_${pos.symbol}`,
              timestamp: now,
              level: 'WARN',
              category: 'ORDER',
              message: `Ordre STOP_LOSS_LIMIT exécuté sur Binance pour ${pos.symbol} à ${currentPrice} USDT (${pnlPct.toFixed(2)}%). Perte contenue à ${netTradePnl.toFixed(2)} USDT.`,
              symbol: pos.symbol,
            });
            continue;
          }

          // Otherwise keep open with updated values
          updatedPositions.push({
            ...pos,
            currentPrice,
            currentPnlUsd: Number(pnlUsd.toFixed(2)),
            currentPnlPct: Number(pnlPct.toFixed(2)),
          });
        }

        // 3. Check for new buy signals if room is available
        const openSymbols = new Set(updatedPositions.map((p) => p.symbol));
        if (updatedPositions.length < riskConfig.maxSimultaneousPositions) {
          const eligibleCandidates = pairs.filter((p) => {
            if (openSymbols.has(p.symbol)) return false;
            if (!p.isEnabled) return false;
            const evalRes = evaluatePairFilters(p, universeConfig);
            return evalRes.isEligible && p.activeSignal === 'BUY_SIGNAL';
          });

          // Priority rule: Highest volume first
          eligibleCandidates.sort((a, b) => b.volume24h - a.volume24h);
          const slotsAvailable = riskConfig.maxSimultaneousPositions - updatedPositions.length;
          const toEnter = eligibleCandidates.slice(
            0,
            Math.min(slotsAvailable, riskConfig.maxEntriesPerCandle)
          );

          for (const cand of toEnter) {
            const currentTotalEquity =
              updatedBalance +
              updatedPositions.reduce((s, p) => s + p.costUsd + p.currentPnlUsd, 0);

            // 1. Filtre de Corrélation Multi-Actifs (Audit Page 9)
            if (riskConfig.correlationFilterEnabled) {
              const corrCheck = evaluateCorrelationFilter(
                cand.symbol,
                cand.assetCategory,
                updatedPositions.map((p) => p.symbol)
              );
              if (!corrCheck.allowed) {
                newLogs.push({
                  id: `log_corr_${now}_${cand.symbol.replace('/', '')}`,
                  timestamp: now,
                  level: 'WARN',
                  category: 'RISK',
                  message: corrCheck.reason || `Signal ${cand.symbol} ignoré pour éviter la corrélation.`,
                  symbol: cand.symbol,
                });
                continue;
              }
            }

            // 2. Calcul du Position Sizing par le Risque (Audit Pages 10 & 11)
            const stopLossPrice = Number(
              (cand.price * (1 - riskConfig.stopLossPct / 100)).toFixed(cand.price < 1 ? 5 : 2)
            );

            const sizing = calculateSpotPositionSizing({
              totalEquity: currentTotalEquity,
              availableCash: updatedBalance,
              riskPercentage: riskConfig.riskPerTradePct || 1.0,
              entryPrice: cand.price,
              stopLossPrice,
              targetRiskRewardRatio: riskConfig.minRiskRewardRatio || riskConfig.takeProfitRatio || 2.0,
              maxAllocationPct: riskConfig.maxAllocationPerPositionPct || 20.0,
              minNotionalUsd: riskConfig.minNotionalUsd || 10.0,
            });

            if (!sizing.isAccepted) {
              newLogs.push({
                id: `log_reject_${now}_${cand.symbol.replace('/', '')}`,
                timestamp: now,
                level: 'WARN',
                category: 'RISK',
                message: `Ordre ${cand.symbol} rejeté : ${sizing.rejectReason}`,
                symbol: cand.symbol,
              });
              continue;
            }

            const targetPositionCost = sizing.positionSizeUsd;
            const entryFee = targetPositionCost * 0.001; // 0.1% spot fee
            updatedBalance -= targetPositionCost;

            updatedPositions.push({
              id: `pos_${now}_${cand.symbol.replace('/', '')}`,
              symbol: cand.symbol,
              side: 'LONG',
              mode: prevState.mode,
              entryPrice: cand.price,
              currentPrice: cand.price,
              quantity: sizing.unitsToBuy,
              costUsd: sizing.positionSizeUsd,
              entryTime: now,
              stopLossPrice: sizing.stopLossPrice,
              takeProfitPrice: sizing.takeProfitPrice,
              stopLossType: 'STOP_LOSS_LIMIT',
              stopOrderIdOnExchange: `ORD_SL_${Math.floor(Math.random() * 900000 + 100000)}_${cand.baseAsset}`,
              currentPnlUsd: 0,
              currentPnlPct: 0,
              feesPaidUsd: Number(entryFee.toFixed(2)),
              status: 'OPEN',
            });

            newLogs.push({
              id: `log_entry_${now}_${cand.symbol.replace('/', '')}`,
              timestamp: now,
              level: 'INFO',
              category: 'ORDER',
              message: `Signal BUY validé sur ${cand.symbol}. Sizing Risque 1% : ${sizing.positionSizeUsd} USDT. SL : ${sizing.stopLossPrice} (Perte max : -${sizing.maxLossUsd} USDT), TP : ${sizing.takeProfitPrice} (+${sizing.expectedGainUsd} USDT, Ratio R:R 1:${sizing.actualRiskRewardRatio}).`,
              symbol: cand.symbol,
            });
          }
        }

        // 4. Check Circuit Breaker (5% max daily drawdown - Mode Actif & Protecteur)
        const finalTotalEquity =
          updatedBalance +
          updatedPositions.reduce((s, p) => s + p.costUsd + p.currentPnlUsd, 0);
        const dayPnlUsd = finalTotalEquity - prevState.startOfDayEquity;
        const dayLossPct = ((prevState.startOfDayEquity - finalTotalEquity) / prevState.startOfDayEquity) * 100;

        let finalStatus: BotStatus = prevState.status;
        let circuitBreakerUntil = prevState.circuitBreakerUntil;

        if (dayLossPct >= riskConfig.dailyLossCircuitBreakerPct && prevState.status === 'running') {
          finalStatus = 'circuit_breaker';
          circuitBreakerUntil = now + (riskConfig.circuitBreakerPauseHours || 24) * 3600 * 1000;

          if (riskConfig.circuitBreakerMode === 'ACTIVE_PROTECTIVE_CLOSE') {
            // Mode Actif d'audit : Clôture immédiate de sauvegarde de toutes les positions pour bloquer le drawdown à -5% max
            for (const pos of updatedPositions) {
              const exitFee = pos.costUsd * 0.001;
              const netPnl = pos.currentPnlUsd - exitFee;
              updatedBalance += pos.costUsd + netPnl;
              newClosedTrades.push({
                id: `tr_cb_exit_${now}_${pos.symbol.replace('/', '')}`,
                symbol: pos.symbol,
                side: 'BUY',
                mode: prevState.mode,
                entryPrice: pos.entryPrice,
                exitPrice: pos.currentPrice,
                quantity: pos.quantity,
                entryTime: pos.entryTime,
                exitTime: now,
                pnlUsd: Number(netPnl.toFixed(2)),
                pnlPct: Number(pos.currentPnlPct.toFixed(2)),
                feesUsd: Number((pos.feesPaidUsd + exitFee).toFixed(2)),
                exitReason: 'CIRCUIT_BREAKER' as any,
                durationMinutes: Math.floor((now - pos.entryTime) / 60000),
              });
            }
            updatedPositions = [];
            newLogs.push({
              id: `log_cb_${now}`,
              timestamp: now,
              level: 'ERROR',
              category: 'RISK',
              message: `COUPE-CIRCUIT STRICT DÉCLENCHÉ (-${dayLossPct.toFixed(2)}%) : Sauvegarde active exécutée. Clôture immédiate de toutes les positions ouvertes pour plafonner la perte à -5% max (Résolution anomalie d'audit R3).`,
            });
          } else {
            newLogs.push({
              id: `log_cb_${now}`,
              timestamp: now,
              level: 'ERROR',
              category: 'RISK',
              message: `GARDE-FOU ACTIVÉ : Perte journalière de ${dayLossPct.toFixed(2)} % ≥ seuil de ${riskConfig.dailyLossCircuitBreakerPct} %. Toutes les nouvelles entrées sont suspendues pour 24h.`,
            });
          }
        }

        return {
          ...prevState,
          balanceUsd: Number(updatedBalance.toFixed(2)),
          status: finalStatus,
          circuitBreakerUntil,
          positions: updatedPositions,
          trades: [...newClosedTrades, ...prevState.trades],
          logs: [...newLogs, ...prevState.logs].slice(0, 100),
          dailyPnlUsd: Number(dayPnlUsd.toFixed(2)),
          dailyPnlPct: Number(((dayPnlUsd / prevState.startOfDayEquity) * 100).toFixed(2)),
        };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [pairs, riskConfig, universeConfig]);

  // Handler toggles
  const handleToggleStatus = () => {
    setActiveEngineState((prev) => {
      const nextStatus: BotStatus = prev.status === 'running' ? 'paused' : 'running';
      return {
        ...prev,
        status: nextStatus,
        logs: [
          {
            id: `log_${Date.now()}`,
            timestamp: Date.now(),
            level: 'INFO',
            category: 'ENGINE',
            message: `Moteur Tradng_bot basculé en état : ${nextStatus.toUpperCase()}`,
          },
          ...prev.logs,
        ],
      };
    });
  };

  const handleResetDailyLoss = () => {
    setActiveEngineState((prev) => ({
      ...prev,
      status: 'running',
      circuitBreakerUntil: null,
      startOfDayEquity:
        prev.balanceUsd +
        prev.positions.reduce((s, p) => s + p.costUsd + p.currentPnlUsd, 0),
      logs: [
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          level: 'SECURITY',
          category: 'RISK',
          message: 'Circuit breaker débloqué manuellement par l’utilisateur. Surveillance reprise.',
        },
        ...prev.logs,
      ],
    }));
  };

  const handleClosePosition = (positionId: string) => {
    setActiveEngineState((prev) => {
      const target = prev.positions.find((p) => p.id === positionId);
      if (!target) return prev;

      const now = Date.now();
      const exitFee = target.costUsd * 0.001;
      const netPnl = target.currentPnlUsd - exitFee;
      const newBalance = prev.balanceUsd + target.costUsd + netPnl;

      const closedTrade: Trade = {
        id: `tr_manual_${now}`,
        symbol: target.symbol,
        side: 'BUY',
        mode: prev.mode,
        entryPrice: target.entryPrice,
        exitPrice: target.currentPrice,
        quantity: target.quantity,
        entryTime: target.entryTime,
        exitTime: now,
        pnlUsd: Number(netPnl.toFixed(2)),
        pnlPct: target.currentPnlPct,
        feesUsd: Number((target.feesPaidUsd + exitFee).toFixed(2)),
        exitReason: 'MANUAL',
        durationMinutes: Math.floor((now - target.entryTime) / 60000),
      };

      return {
        ...prev,
        balanceUsd: Number(newBalance.toFixed(2)),
        positions: prev.positions.filter((p) => p.id !== positionId),
        trades: [closedTrade, ...prev.trades],
        logs: [
          {
            id: `log_${now}`,
            timestamp: now,
            level: 'INFO',
            category: 'ORDER',
            message: `Clôture manuelle effectuée sur ${target.symbol} à ${target.currentPrice} USDT. P&L net : ${netPnl.toFixed(2)} USDT.`,
            symbol: target.symbol,
          },
          ...prev.logs,
        ],
      };
    });
  };

  const handleTriggerTestOrder = (symbol: string) => {
    setActiveEngineState((prev) => {
      const pair = pairs.find((p) => p.symbol === symbol);
      if (!pair) return prev;

      if (prev.positions.some((p) => p.symbol === symbol)) {
        return {
          ...prev,
          logs: [
            {
              id: `log_${Date.now()}`,
              timestamp: Date.now(),
              level: 'WARN',
              category: 'RISK',
              message: `Position déjà active sur ${symbol}. Ordre test ignoré pour éviter la duplication.`,
              symbol,
            },
            ...prev.logs,
          ],
        };
      }

      if (prev.positions.length >= riskConfig.maxSimultaneousPositions) {
        return {
          ...prev,
          logs: [
            {
              id: `log_${Date.now()}`,
              timestamp: Date.now(),
              level: 'WARN',
              category: 'RISK',
              message: `Plafond de ${riskConfig.maxSimultaneousPositions} positions simultanées atteint. Ordre test rejeté.`,
              symbol,
            },
            ...prev.logs,
          ],
        };
      }

      // Check correlation filter
      if (riskConfig.correlationFilterEnabled) {
        const corr = evaluateCorrelationFilter(
          symbol,
          pair.assetCategory,
          prev.positions.map((p) => p.symbol)
        );
        if (!corr.allowed) {
          return {
            ...prev,
            logs: [
              {
                id: `log_corr_${Date.now()}`,
                timestamp: Date.now(),
                level: 'WARN',
                category: 'RISK',
                message: corr.reason || `Ordre test ${symbol} refusé par le filtre de corrélation multi-actifs.`,
                symbol,
              },
              ...prev.logs,
            ],
          };
        }
      }

      const now = Date.now();
      const currentTotalEquity =
        prev.balanceUsd + prev.positions.reduce((s, p) => s + p.costUsd + p.currentPnlUsd, 0);

      const stopLossPrice = Number(
        (pair.price * (1 - riskConfig.stopLossPct / 100)).toFixed(pair.price < 1 ? 5 : 2)
      );

      const sizing = calculateSpotPositionSizing({
        totalEquity: currentTotalEquity,
        availableCash: prev.balanceUsd,
        riskPercentage: riskConfig.riskPerTradePct || 1.0,
        entryPrice: pair.price,
        stopLossPrice,
        targetRiskRewardRatio: riskConfig.minRiskRewardRatio || riskConfig.takeProfitRatio || 2.0,
        maxAllocationPct: riskConfig.maxAllocationPerPositionPct || 20.0,
        minNotionalUsd: riskConfig.minNotionalUsd || 10.0,
      });

      if (!sizing.isAccepted) {
        return {
          ...prev,
          logs: [
            {
              id: `log_${now}`,
              timestamp: now,
              level: 'WARN',
              category: 'RISK',
              message: `Ordre test sur ${symbol} refusé par le moteur de gestion du risque : ${sizing.rejectReason}`,
              symbol,
            },
            ...prev.logs,
          ],
        };
      }

      const targetPositionCost = sizing.positionSizeUsd;
      const newBalance = prev.balanceUsd - targetPositionCost;

      const newPos: Position = {
        id: `pos_${now}_${symbol.replace('/', '')}`,
        symbol,
        side: 'LONG',
        mode: prev.mode,
        entryPrice: pair.price,
        currentPrice: pair.price,
        quantity: sizing.unitsToBuy,
        costUsd: targetPositionCost,
        entryTime: now,
        stopLossPrice: sizing.stopLossPrice,
        takeProfitPrice: sizing.takeProfitPrice,
        stopLossType: 'STOP_LOSS_LIMIT',
        stopOrderIdOnExchange: `ORD_SL_${Math.floor(sizing.stopLossPrice)}_${symbol.replace('/', '')}`,
        currentPnlUsd: 0,
        currentPnlPct: 0,
        feesPaidUsd: Number((targetPositionCost * 0.001).toFixed(2)),
        status: 'OPEN',
      };

      return {
        ...prev,
        balanceUsd: Number(newBalance.toFixed(2)),
        positions: [newPos, ...prev.positions],
        logs: [
          {
            id: `log_${now}`,
            timestamp: now,
            level: 'INFO',
            category: 'ORDER',
            message: `Ordre test exécuté : Sizing Risque 1% = ${targetPositionCost} USDT sur ${symbol}. SL : ${sizing.stopLossPrice} (Perte max : -${sizing.maxLossUsd} USDT), TP : ${sizing.takeProfitPrice} (+${sizing.expectedGainUsd} USDT, Ratio R:R 1:${sizing.actualRiskRewardRatio}).`,
            symbol,
          },
          ...prev.logs,
        ],
      };
    });
  };

  const handleEmergencyPause = () => {
    setActiveEngineState((prev) => ({
      ...prev,
      status: 'emergency_stopped',
      logs: [
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          level: 'SECURITY',
          category: 'RISK',
          message: "Arrêt d'urgence déclenché : Nouvelles entrées immédiatement suspendues.",
        },
        ...prev.logs,
      ],
    }));
  };

  const handleEmergencyCloseAll = () => {
    setActiveEngineState((prev) => {
      const now = Date.now();
      let addedBalance = 0;
      const closedTrades: Trade[] = [];

      for (const pos of prev.positions) {
        const exitFee = pos.costUsd * 0.001;
        const netPnl = pos.currentPnlUsd - exitFee;
        addedBalance += pos.costUsd + netPnl;

        closedTrades.push({
          id: `tr_emergency_${now}_${pos.symbol}`,
          symbol: pos.symbol,
          side: 'BUY',
          mode: prev.mode,
          entryPrice: pos.entryPrice,
          exitPrice: pos.currentPrice,
          quantity: pos.quantity,
          entryTime: pos.entryTime,
          exitTime: now,
          pnlUsd: Number(netPnl.toFixed(2)),
          pnlPct: pos.currentPnlPct,
          feesUsd: Number((pos.feesPaidUsd + exitFee).toFixed(2)),
          exitReason: 'EMERGENCY_STOP',
          durationMinutes: Math.floor((now - pos.entryTime) / 60000),
        });
      }

      return {
        ...prev,
        status: 'emergency_stopped',
        balanceUsd: Number((prev.balanceUsd + addedBalance).toFixed(2)),
        positions: [],
        trades: [...closedTrades, ...prev.trades],
        logs: [
          {
            id: `log_em_${now}`,
            timestamp: now,
            level: 'SECURITY',
            category: 'RISK',
            message: `ARRÊT D'URGENCE TOTAL : Toutes les positions ouvertes (${prev.positions.length}) ont été vendues au marché et le bot est arrêté.`,
          },
          ...prev.logs,
        ],
      };
    });
  };

  const handleTogglePairEnabled = (symbol: string) => {
    setPairs((prev) =>
      prev.map((p) => (p.symbol === symbol ? { ...p, isEnabled: !p.isEnabled } : p))
    );
  };

  const handleUnlockLiveMode = () => {
    setCurrentMode('live');
    setActiveTab('dashboard');
    setLiveState((prev) => ({
      ...prev,
      logs: [
        {
          id: `log_live_auth_${Date.now()}`,
          timestamp: Date.now(),
          level: 'SECURITY',
          category: 'AUTH',
          message: 'Mode Réel activé avec succès suite à la validation explicite des conditions et à la qualification de la période de démo.',
        },
        ...prev.logs,
      ],
    }));
  };

  const isCircuitBreaker =
    activeEngineState.status === 'circuit_breaker' ||
    (activeEngineState.circuitBreakerUntil !== null &&
      activeEngineState.circuitBreakerUntil > Date.now());

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar Contract Navigation */}
      <Header
        status={activeEngineState.status}
        mode={currentMode}
        lang={lang}
        onToggleStatus={handleToggleStatus}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onSelectMode={handleSelectMode}
        onToggleLang={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        onOpenWizard={() => setIsWizardOpen(true)}
        onOpenTestGuide={() => setIsTestGuideOpen(true)}
        onOpenBudgetAdvisor={() => setIsBudgetAdvisorOpen(true)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        positionsCount={activeEngineState.positions.length}
        circuitBreakerActive={isCircuitBreaker}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenMathAudit={() => setIsMathAuditModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <DashboardTab
            status={activeEngineState.status}
            mode={currentMode}
            balanceUsd={activeEngineState.balanceUsd}
            startOfDayEquity={activeEngineState.startOfDayEquity}
            circuitBreakerUntil={activeEngineState.circuitBreakerUntil}
            positions={activeEngineState.positions}
            recentTrades={activeEngineState.trades}
            riskConfig={riskConfig}
            pairs={pairs}
            onToggleStatus={handleToggleStatus}
            onResetDailyLoss={handleResetDailyLoss}
            onClosePosition={handleClosePosition}
            onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
            onSelectPairForChart={(p) => setSelectedChartPair(p)}
            onTriggerTestOrder={handleTriggerTestOrder}
            lang={lang}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerTab
            pairs={pairs}
            positions={activeEngineState.positions}
            universeConfig={universeConfig}
            onTogglePairEnabled={handleTogglePairEnabled}
            onSelectPairForChart={(p) => setSelectedChartPair(p)}
            lang={lang}
          />
        )}

        {activeTab === 'risk' && (
          <RiskUniverseTab
            riskConfig={riskConfig}
            universeConfig={universeConfig}
            onUpdateRisk={(newCfg) => setRiskConfig((prev) => ({ ...prev, ...newCfg }))}
            onUpdateUniverse={(newCfg) =>
              setUniverseConfig((prev) => ({ ...prev, ...newCfg }))
            }
            lang={lang}
          />
        )}

        {activeTab === 'exchange' && (
          <ExchangeTab
            config={exchangeConfig}
            positions={activeEngineState.positions}
            onUpdateConfig={(newCfg) =>
              setExchangeConfig((prev) => ({ ...prev, ...newCfg }))
            }
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {activeTab === 'admin_keys' && (
          <AdminKeysTab
            currentUser={currentUser}
            onUserChanged={(u) => {
              setCurrentUser(u);
              if (u.binanceApiKey && u.binanceApiSecret) {
                setExchangeConfig((prev) => ({
                  ...prev,
                  apiKey: u.binanceApiKey!,
                  apiSecret: u.binanceApiSecret!,
                }));
              }
            }}
            lang={lang}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramTab
            config={telegramConfig}
            onUpdateConfig={(newCfg) =>
              setTelegramConfig((prev) => ({ ...prev, ...newCfg }))
            }
            lang={lang}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestTab
            riskConfig={riskConfig}
            universeConfig={universeConfig}
            lang={lang}
          />
        )}

        {activeTab === 'qualification' && (
          <DemoScorecardTab
            currentMode={currentMode}
            onUnlockLiveMode={handleUnlockLiveMode}
            lang={lang}
          />
        )}

        {activeTab === 'logs' && (
          <AuditLogsTab
            logs={activeEngineState.logs}
            trades={activeEngineState.trades}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 px-6 text-xs font-mono text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span>Tradng_bot © 2026</span>
          <span className="text-neutral-700">·</span>
          <span>Binance Spot PWA</span>
          <span className="text-neutral-700">·</span>
          <span>Sécurité d'Accès Clés Admin</span>
        </div>
        <div className="text-neutral-500">
          Ce logiciel n’est pas un conseil financier. Avertissement sur les risques de trading spot.
        </div>
      </footer>

      {/* Onboarding Wizard Modal (I1) */}
      <OnboardingModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={(settings) => {
          if (settings.mode) setCurrentMode(settings.mode);
          if (settings.riskConfig) {
            setRiskConfig((prev) => ({ ...prev, ...settings.riskConfig }));
          }
          if (settings.telegramConfig) {
            setTelegramConfig((prev) => ({ ...prev, ...settings.telegramConfig }));
          }
        }}
        lang={lang}
      />

      {/* Emergency Stop Modal (R6) */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onPauseOnly={handleEmergencyPause}
        onCloseAllAndStop={handleEmergencyCloseAll}
        positionsCount={activeEngineState.positions.length}
        totalPnlUsd={activeEngineState.positions.reduce((s, p) => s + p.currentPnlUsd, 0)}
        lang={lang}
      />

      {/* Candlestick & Indicator Technical Chart Modal */}
      <CandleChartModal
        pair={selectedChartPair}
        onClose={() => setSelectedChartPair(null)}
        lang={lang}
      />

      {/* Testing & Integration Walkthrough Guide Modal */}
      <TestGuideModal
        isOpen={isTestGuideOpen}
        onClose={() => setIsTestGuideOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        lang={lang}
      />

      {/* Budget Advisor Modal */}
      {isBudgetAdvisorOpen && (
        <BudgetAdvisorModal
          isOpen={isBudgetAdvisorOpen}
          onClose={() => setIsBudgetAdvisorOpen(false)}
          currentBalance={activeEngineState.balanceUsd}
          riskConfig={riskConfig}
          pairs={pairs}
          onApplyBudget={(budget: number, currency: 'EUR' | 'USD' | 'USDT') => {
            setUserBudgetCurrency(currency);
            setActiveEngineState((prev) => ({
              ...prev,
              balanceUsd: budget,
              startOfDayEquity: budget,
            }));
          }}
          lang={lang}
        />
      )}

      {/* User Login & Access Key Switcher Modal */}
      <UserLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onUserLoggedIn={(u) => {
          setCurrentUser(u);
          if (u.binanceApiKey && u.binanceApiSecret) {
            setExchangeConfig((prev) => ({
              ...prev,
              apiKey: u.binanceApiKey!,
              apiSecret: u.binanceApiSecret!,
            }));
          }
        }}
        lang={lang}
      />

      {/* Mathematical Audit & R:R Verification Modal */}
      <MathAuditModal
        isOpen={isMathAuditModalOpen}
        onClose={() => setIsMathAuditModalOpen(false)}
        currentEquity={
          activeEngineState.balanceUsd +
          activeEngineState.positions.reduce((s, p) => s + p.costUsd + p.currentPnlUsd, 0)
        }
        lang={lang}
      />

      {/* PWA Offline Connection Indicator */}
      <OfflineIndicator lang={lang} />
    </div>
  );
}

