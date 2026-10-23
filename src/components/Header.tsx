import React from 'react';
import { BotStatus, TradingMode, UserProfile } from '../types/trading';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Play,
  Pause,
  AlertOctagon,
  ShieldCheck,
  Server,
  Send,
  Zap,
  HelpCircle,
  Coins,
  Key,
  User,
  Shield,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  status: BotStatus;
  mode: TradingMode;
  lang: 'fr' | 'en';
  onToggleStatus: () => void;
  onOpenEmergencyModal: () => void;
  onSelectMode: (mode: TradingMode) => void;
  onToggleLang: () => void;
  onOpenWizard: () => void;
  onOpenTestGuide: () => void;
  onOpenBudgetAdvisor?: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  positionsCount: number;
  circuitBreakerActive: boolean;
  currentUser: UserProfile | null;
  onOpenLoginModal: () => void;
  onOpenMathAudit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  mode,
  lang,
  onToggleStatus,
  onOpenEmergencyModal,
  onSelectMode,
  onToggleLang,
  onOpenWizard,
  onOpenTestGuide,
  onOpenBudgetAdvisor,
  activeTab,
  onTabChange,
  positionsCount,
  circuitBreakerActive,
  currentUser,
  onOpenLoginModal,
  onOpenMathAudit,
}) => {
  const isFrench = lang === 'fr';

  const navLinks = [
    { id: 'dashboard', label: isFrench ? '🤖 Bot & Accueil' : '🤖 Dashboard' },
    { id: 'scanner', label: isFrench ? '📊 Scanner Binance' : '📊 Scanner' },
    { id: 'risk', label: isFrench ? '🛡️ Risque & Univers' : '🛡️ Risk' },
    { id: 'exchange', label: isFrench ? '⚡ Binance Spot' : '⚡ Binance Spot' },
    { id: 'admin_keys', label: isFrench ? '🔑 Clés & Utilisateurs' : '🔑 Keys & Admin' },
    { id: 'telegram', label: isFrench ? '📱 Telegram' : '📱 Telegram' },
    { id: 'backtest', label: isFrench ? '📈 Backtest' : '📈 Backtest' },
    { id: 'qualification', label: isFrench ? '🎓 Période Démo' : '🎓 Qualification' },
    { id: 'logs', label: isFrench ? '📋 Logs' : '📋 Logs' },
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950 text-neutral-100 sticky top-0 z-40">
      {/* Top zone adhering to Top Bar Contract */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5">
        {/* Zone 1: Brand wordmark & Mode Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onTabChange('dashboard')}
          >
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono">
              Tradng<span className="text-emerald-400">_bot</span>
            </span>
            <span className="hidden sm:inline text-[10px] text-neutral-400 font-mono px-1 py-0.5 rounded bg-neutral-900 border border-neutral-800">
              PWA
            </span>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div className="hidden lg:flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => onSelectMode('simulation')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                mode === 'simulation'
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isFrench ? 'Simulation' : 'Simulation'}
            </button>
            <button
              onClick={() => onSelectMode('testnet')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                mode === 'testnet'
                  ? 'bg-neutral-800 text-amber-400 font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isFrench ? 'Testnet' : 'Testnet'}
            </button>
            <button
              onClick={() => onSelectMode('live')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                mode === 'live'
                  ? 'bg-rose-950/80 text-rose-300 font-semibold border border-rose-800/50 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isFrench ? 'Binance Réel' : 'Live Binance'}
            </button>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean typography) */}
        <nav className="hidden 2xl:flex items-center gap-4 text-xs font-medium text-neutral-400">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onTabChange(link.id)}
              className={`whitespace-nowrap transition-colors py-1 ${
                activeTab === link.id
                  ? 'text-white border-b-2 border-emerald-400 font-semibold'
                  : 'hover:text-neutral-200'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: User Session, PWA Install & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* User Profile & Key Pill */}
          <button
            onClick={onOpenLoginModal}
            title={isFrench ? "Changer de compte ou d'accès" : 'Switch user or access key'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-mono transition"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                currentUser?.role === 'admin'
                  ? 'bg-purple-400'
                  : currentUser?.canTradeLive
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-white max-w-[100px] sm:max-w-[130px] truncate">
              {currentUser?.name || 'Invité'}
            </span>
            <span
              className={`hidden sm:inline px-1 rounded text-[9px] uppercase font-bold ${
                currentUser?.role === 'admin'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {currentUser?.role || 'user'}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-500" />
          </button>

          {/* PWA Install Button (Vite PWA Compliant) */}
          <PWAInstallButton lang={lang} />

          {/* Bot State Button */}
          {circuitBreakerActive ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="font-bold">CIRCUIT BREAKER</span>
            </div>
          ) : (
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                status === 'running'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              {status === 'running' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold">{isFrench ? 'BOT ACTIF' : 'BOT ACTIVE'}</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">{isFrench ? 'EN PAUSE' : 'PAUSED'}</span>
                </>
              )}
            </button>
          )}

          {/* Emergency Kill-Switch */}
          <button
            onClick={onOpenEmergencyModal}
            title={isFrench ? "Arrêt d'urgence immédiat" : 'Emergency Kill-Switch'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono font-semibold bg-rose-950/50 text-rose-300 border border-rose-800 hover:bg-rose-900/60 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">{isFrench ? 'Arrêt d’urgence' : 'Kill Switch'}</span>
          </button>

          {/* Budget Simulator */}
          {onOpenBudgetAdvisor && (
            <button
              onClick={onOpenBudgetAdvisor}
              title={isFrench ? 'Simulateur de budget' : 'Budget advisor'}
              className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded text-xs font-mono font-medium bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isFrench ? 'Budget' : 'Budget'}</span>
            </button>
          )}

          {/* Technical Math Audit Resolution */}
          {onOpenMathAudit && (
            <button
              onClick={onOpenMathAudit}
              title={isFrench ? "Consulter l'Audit Mathématique (Rapport & Sizing)" : 'Math Audit & Sizing'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-bold bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600 text-emerald-300 transition shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{isFrench ? 'Audit R:R 1:2' : 'Audit 1:2'}</span>
            </button>
          )}

          {/* Quick Guide */}
          <button
            onClick={onOpenTestGuide}
            title={isFrench ? 'Guide de test & connexion' : 'Test guide'}
            className="p-1.5 rounded text-emerald-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Wizard */}
          <button
            onClick={onOpenWizard}
            title={isFrench ? 'Assistant d’installation' : 'Setup wizard'}
            className="p-1.5 rounded text-amber-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
          >
            <Zap className="w-4 h-4" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="px-2 py-1 rounded text-xs font-mono text-neutral-400 hover:text-white border border-neutral-800 hover:bg-neutral-900 transition-colors"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Secondary Bar for Mobile & Compact Navigation */}
      <div className="2xl:hidden flex items-center gap-2 overflow-x-auto px-4 py-2 border-t border-neutral-800/80 bg-neutral-900/50 scrollbar-none text-xs">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onTabChange(link.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded transition-colors ${
              activeTab === link.id
                ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Contextual Status Strip */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-1 bg-neutral-900/90 border-t border-neutral-800 text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Binance Spot : Connecté</span>
          </div>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <div className="hidden sm:flex items-center gap-1.5">
            <Key className="w-3 h-3 text-emerald-400" />
            <span>
              Clé :{' '}
              <span className="text-neutral-200 font-bold">
                {currentUser?.accessKey || 'Non authentifié'}
              </span>
            </span>
          </div>
          <span className="hidden md:inline text-neutral-600">|</span>
          <button
            onClick={onOpenMathAudit}
            className="hidden md:flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition"
            title="Cliquez pour inspecter la conformité mathématique de l'audit"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold underline decoration-emerald-500/50">Audit : R:R 1:2 & Risque 1% Conformes</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span>Positions : {positionsCount} / 5</span>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <span className="hidden sm:flex items-center gap-1 text-neutral-300">
            <Server className="w-3 h-3 text-neutral-400" />
            <span>PWA & Standalone</span>
          </span>
        </div>
      </div>
    </header>
  );
};
