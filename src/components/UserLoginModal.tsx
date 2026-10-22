import React, { useState } from 'react';
import { UserProfile } from '../types/trading';
import {
  loginWithAccessKey,
  MASTER_ADMIN_KEY,
  getStoredAccessKeys,
} from '../services/accessKeyService';
import {
  Key,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  X,
  Lock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserLoggedIn: (user: UserProfile) => void;
  lang?: 'fr' | 'en';
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  isOpen,
  onClose,
  onUserLoggedIn,
  lang = 'fr',
}) => {
  const isFrench = lang === 'fr';
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (keyToTest?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const key = (keyToTest || accessKeyInput).trim();

    if (!key) {
      setErrorMsg(
        isFrench
          ? 'Veuillez saisir une clé d’accès valide générée par l’administrateur.'
          : 'Please enter a valid admin-generated access key.'
      );
      return;
    }

    const res = loginWithAccessKey(key);
    if (res.success && res.user) {
      setSuccessMsg(
        isFrench
          ? `Connexion réussie ! Bienvenue, ${res.user.name} (${res.user.role.toUpperCase()})`
          : `Connected successfully as ${res.user.name} (${res.user.role.toUpperCase()})`
      );
      setTimeout(() => {
        onUserLoggedIn(res.user!);
        onClose();
      }, 700);
    } else {
      setErrorMsg(res.error || (isFrench ? 'Clé d’accès invalide ou révoquée.' : 'Invalid key.'));
    }
  };

  const sampleKeys = getStoredAccessKeys().slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950 border border-emerald-800 rounded text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-white">
                {isFrench ? 'CONNEXION PAR CLÉ D’ACCÈS' : 'ACCESS KEY LOGIN'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isFrench
                  ? 'Contrôle d’accès multi-utilisateurs & permissions'
                  : 'Multi-user role & permissions gateway'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Information Notice */}
          <div className="p-3.5 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{isFrench ? 'Sécurité Stricte Administrateur' : 'Admin Controlled Access'}</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {isFrench
                ? 'Ce bot de trading spot Binance est protégé. Seul l’administrateur système peut générer des clés d’accès avec autorisations spécifiques (trading réel, testnet, plafond budgétaire).'
                : 'This Binance trading bot is protected. Only the system administrator can generate access keys with specific permissions (live trading, testnet, capital caps).'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-neutral-300">
              {isFrench
                ? 'Saisissez votre clé d’accès (fournie par l’admin) :'
                : 'Enter your Admin-generated Access Key:'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={accessKeyInput}
                  onChange={(e) => setAccessKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="ex: TRD-USER-DEMO-7721 ou TRD-ADMIN-MASTER-2025"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => handleLogin()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium rounded transition active:scale-95 shadow-sm"
              >
                <span>{isFrench ? 'Se connecter' : 'Log in'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Error / Success Notices */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded text-emerald-300 text-xs font-mono flex items-center gap-2">
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick 1-Click Access for Testing */}
          <div className="pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isFrench ? 'Clés de démonstration prêtes à tester :' : 'Demo test keys:'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {sampleKeys.map((sk) => (
                <button
                  key={sk.id}
                  onClick={() => {
                    setAccessKeyInput(sk.key);
                    handleLogin(sk.key);
                  }}
                  className="flex items-center justify-between p-2.5 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 rounded text-left transition group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        sk.role === 'admin'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : sk.role === 'trader'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {sk.role}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-white group-hover:text-emerald-300">
                        {sk.label}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-500">{sk.key}</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-neutral-400 group-hover:text-white flex items-center gap-1">
                    {isFrench ? 'Tester' : 'Test'} &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
