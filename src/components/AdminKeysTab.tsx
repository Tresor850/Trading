import React, { useState } from 'react';
import { UserAccessKey, UserProfile, UserRole } from '../types/trading';
import {
  getStoredAccessKeys,
  generateNewAccessKey,
  updateAccessKeyStatus,
  deleteAccessKey,
  loginWithAccessKey,
  MASTER_ADMIN_KEY,
} from '../services/accessKeyService';
import {
  Key,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  UserPlus,
  Users,
  Ban,
  Trash2,
  Lock,
  Unlock,
  Coins,
  Calendar,
  Sparkles,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface AdminKeysTabProps {
  currentUser: UserProfile | null;
  onUserChanged: (user: UserProfile) => void;
  lang?: 'fr' | 'en';
}

export const AdminKeysTab: React.FC<AdminKeysTabProps> = ({
  currentUser,
  onUserChanged,
  lang = 'fr',
}) => {
  const isFrench = lang === 'fr';
  const isAdmin = currentUser?.role === 'admin';

  const [keysList, setKeysList] = useState<UserAccessKey[]>(() => getStoredAccessKeys());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states for creating a new key
  const [labelInput, setLabelInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('trader');
  const [canTradeLive, setCanTradeLive] = useState(true);
  const [canUseTestnet, setCanUseTestnet] = useState(true);
  const [maxBudgetUsd, setMaxBudgetUsd] = useState(2500);
  const [expiresDays, setExpiresDays] = useState<number | null>(30);
  const [binanceKeyMode, setBinanceKeyMode] = useState<'user_provides' | 'admin_assigns'>('user_provides');
  const [assignedApiKey, setAssignedApiKey] = useState('');
  const [assignedApiSecret, setAssignedApiSecret] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Generated key modal/feedback
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<UserAccessKey | null>(null);

  const refreshList = () => {
    setKeysList(getStoredAccessKeys());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelInput.trim()) return;

    const created = generateNewAccessKey({
      label: labelInput,
      email: emailInput,
      role: roleInput,
      canTradeLive,
      canUseTestnet,
      maxBudgetUsd,
      expiresDays,
      assignedBinanceApiKey: binanceKeyMode === 'admin_assigns' ? assignedApiKey : undefined,
      assignedBinanceApiSecret: binanceKeyMode === 'admin_assigns' ? assignedApiSecret : undefined,
      notes: notesInput,
      adminName: currentUser?.name || 'Administrateur',
    });

    setNewlyCreatedKey(created);
    setLabelInput('');
    setEmailInput('');
    setNotesInput('');
    setAssignedApiKey('');
    setAssignedApiSecret('');
    refreshList();
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    updateAccessKeyStatus(id, nextStatus as 'active' | 'suspended');
    refreshList();
  };

  const handleRevoke = (id: string) => {
    updateAccessKeyStatus(id, 'revoked');
    refreshList();
  };

  const handleDelete = (id: string) => {
    deleteAccessKey(id);
    refreshList();
  };

  const handleSwitchToKey = (keyStr: string) => {
    const res = loginWithAccessKey(keyStr);
    if (res.success && res.user) {
      onUserChanged(res.user);
    }
  };

  // If user is not admin, show restricted view with master admin login button
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold font-mono text-white">
            {isFrench ? 'ZONE RESTREINTE — ACCÈS ADMINISTRATEUR REQUIS' : 'RESTRICTED — ADMIN ONLY'}
          </h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {isFrench
              ? 'Seul l’administrateur système a le privilège de générer des clés d’accès et d’octroyer les droits de connexion au compte réel Binance.'
              : 'Only the system administrator can generate access keys and grant trading credentials.'}
          </p>
        </div>

        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-left max-w-md mx-auto space-y-3">
          <div className="text-xs font-mono text-neutral-300">
            {isFrench ? 'Votre session actuelle :' : 'Current session:'}{' '}
            <span className="text-emerald-400 font-bold">{currentUser?.name}</span> (
            <span className="uppercase text-neutral-400">{currentUser?.role}</span>)
          </div>
          <p className="text-[11px] text-neutral-500">
            {isFrench
              ? 'Pour administrer et générer de nouvelles clés utilisateurs, connectez-vous avec la Clé Maître Admin.'
              : 'To manage access keys, please sign in using the Master Admin Key.'}
          </p>
          <button
            onClick={() => handleSwitchToKey(MASTER_ADMIN_KEY)}
            className="w-full py-2 px-3 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 font-mono text-xs font-medium transition"
          >
            {isFrench ? '👑 Se connecter en tant qu’Administrateur Maître' : '👑 Sign in as Master Admin'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-950/80 border border-purple-800 rounded-lg text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-white">
                {isFrench
                  ? 'GESTION DES ACCÈS & GÉNÉRATION DE CLÉS UTILISATEURS'
                  : 'ADMIN ACCESS KEY GENERATOR'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/60 border border-purple-700 text-purple-300">
                ADMIN MASTER
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isFrench
                ? 'Générez des clés d’accès personnalisées pour vos utilisateurs. Chaque clé définit l’accès au trading réel Binance, le plafond budgétaire et la durée de validité.'
                : 'Create customized access keys for users. Control Binance live execution, capital limits, and expiration.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-neutral-300">
            <span className="text-neutral-500">{isFrench ? 'Clés actives : ' : 'Active keys: '}</span>
            <span className="text-emerald-400 font-bold">
              {keysList.filter((k) => k.status === 'active').length}
            </span>{' '}
            / {keysList.length}
          </div>
        </div>
      </div>

      {/* Newly Created Key Alert Modal */}
      {newlyCreatedKey && (
        <div className="p-5 bg-emerald-950/60 border-2 border-emerald-600 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-mono font-bold text-sm">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>
                {isFrench
                  ? 'NOUVELLE CLÉ D’ACCÈS GÉNÉRÉE AVEC SUCCÈS !'
                  : 'NEW ACCESS KEY GENERATED!'}
              </span>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-xs font-mono text-neutral-400 hover:text-white"
            >
              {isFrench ? 'Fermer l’alerte' : 'Dismiss'}
            </button>
          </div>

          <p className="text-xs text-neutral-300">
            {isFrench
              ? `Transmettez cette clé à votre utilisateur (${newlyCreatedKey.label}). Il pourra l’utiliser directement pour se connecter au bot et au site PWA.`
              : `Share this access key with user (${newlyCreatedKey.label}) to grant instant connection.`}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-neutral-950 rounded-lg border border-emerald-800">
            <div className="font-mono text-base font-bold text-white tracking-wider flex-1 select-all">
              {newlyCreatedKey.key}
            </div>
            <button
              onClick={() => handleCopy(newlyCreatedKey.key)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium rounded transition"
            >
              {copiedKey === newlyCreatedKey.key ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isFrench ? 'Copié !' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{isFrench ? 'Copier la clé' : 'Copy Key'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Section: Generator Form & Keys Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: Generator Form */}
        <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold font-mono text-white uppercase">
              {isFrench ? 'Créer une Clé Utilisateur' : 'Generate New Key'}
            </h3>
          </div>

          <form onSubmit={handleGenerateKey} className="space-y-4 text-xs font-mono">
            {/* User Label / Name */}
            <div>
              <label className="text-neutral-300 block mb-1">
                {isFrench ? 'Nom / Libellé de l’utilisateur *' : 'User Label / Name *'}
              </label>
              <input
                type="text"
                required
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder={isFrench ? 'ex: Trader Marc - Compte Spot VIP' : 'e.g. Trader Alice'}
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label className="text-neutral-300 block mb-1">
                {isFrench ? 'Email de contact (optionnel)' : 'Contact Email (optional)'}
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="utilisateur@domaine.com"
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-neutral-300 block mb-1">
                {isFrench ? 'Rôle de l’utilisateur' : 'User Role'}
              </label>
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as UserRole)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="trader">
                  {isFrench ? 'Trader (Peut lancer le bot & exécuter)' : 'Trader (Bot & Orders)'}
                </option>
                <option value="viewer">
                  {isFrench ? 'Observateur (Consultation seule)' : 'Viewer (Read-only)'}
                </option>
                <option value="admin">
                  {isFrench ? 'Administrateur Délégué (Plein pouvoir)' : 'Admin'}
                </option>
              </select>
            </div>

            {/* Trading Permissions */}
            <div className="space-y-2 p-3 bg-neutral-950 rounded border border-neutral-800">
              <span className="text-neutral-400 font-bold block mb-1">
                {isFrench ? 'Permissions Binance Spot :' : 'Binance Spot Permissions:'}
              </span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canTradeLive}
                  onChange={(e) => setCanTradeLive(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-white">
                  {isFrench ? 'Autoriser le Trading Réel Binance' : 'Allow Live Binance Trading'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canUseTestnet}
                  onChange={(e) => setCanUseTestnet(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-600 focus:ring-0"
                />
                <span className="text-neutral-300">
                  {isFrench ? 'Autoriser le mode Démo Testnet' : 'Allow Testnet Demo'}
                </span>
              </label>
            </div>

            {/* Max Budget Limit */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span>{isFrench ? 'Plafond Capital Max Alloué' : 'Max Budget Cap'}</span>
                <span className="text-emerald-400 font-bold">{maxBudgetUsd.toLocaleString()} USDT</span>
              </div>
              <input
                type="range"
                min={200}
                max={25000}
                step={100}
                value={maxBudgetUsd}
                onChange={(e) => setMaxBudgetUsd(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Validity Duration */}
            <div>
              <label className="text-neutral-300 block mb-1">
                {isFrench ? 'Durée de validité' : 'Key Validity'}
              </label>
              <select
                value={expiresDays === null ? 'unlimited' : expiresDays}
                onChange={(e) =>
                  setExpiresDays(e.target.value === 'unlimited' ? null : Number(e.target.value))
                }
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={7}>{isFrench ? '7 jours (Période d’essai)' : '7 days'}</option>
                <option value={30}>{isFrench ? '30 jours (Standard)' : '30 days'}</option>
                <option value={90}>{isFrench ? '90 jours (Trimestre)' : '90 days'}</option>
                <option value={365}>{isFrench ? '1 an' : '1 year'}</option>
                <option value="unlimited">{isFrench ? 'Illimité (Permanent)' : 'Unlimited'}</option>
              </select>
            </div>

            {/* Binance Keys Assignment Mode */}
            <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-2">
              <label className="text-neutral-300 block font-bold mb-1">
                {isFrench ? 'Attribution des Clés API Binance :' : 'Binance API Key Policy:'}
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="binanceMode"
                    checked={binanceKeyMode === 'user_provides'}
                    onChange={() => setBinanceKeyMode('user_provides')}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span className="text-neutral-300">
                    {isFrench
                      ? 'L’utilisateur saisit ses propres clés API'
                      : 'User inputs their own Binance keys'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="binanceMode"
                    checked={binanceKeyMode === 'admin_assigns'}
                    onChange={() => setBinanceKeyMode('admin_assigns')}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span className="text-emerald-400 font-semibold">
                    {isFrench
                      ? 'Pré-attribuer les clés Binance gérées par l’Admin'
                      : 'Pre-assign Admin-managed Binance API'}
                  </span>
                </label>
              </div>

              {binanceKeyMode === 'admin_assigns' && (
                <div className="pt-2 space-y-2 border-t border-neutral-800 mt-2">
                  <input
                    type="text"
                    placeholder="Clé API Binance pré-attribuée"
                    value={assignedApiKey}
                    onChange={(e) => setAssignedApiKey(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="password"
                    placeholder="Secret API Binance pré-attribué"
                    value={assignedApiSecret}
                    onChange={(e) => setAssignedApiSecret(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-neutral-300 block mb-1">
                {isFrench ? 'Notes internes' : 'Internal Notes'}
              </label>
              <textarea
                rows={2}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder={isFrench ? 'ex: Contrat signé le 22/10, spot uniquement' : 'Notes'}
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isFrench ? 'GÉNÉRER LA CLÉ D’ACCÈS' : 'GENERATE ACCESS KEY'}</span>
            </button>
          </form>
        </div>

        {/* Column 2: Keys List & Permissions Audit */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold font-mono text-white uppercase">
                {isFrench ? 'Clés d’Accès en Registre' : 'Registered Access Keys'} ({keysList.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              {isFrench
                ? 'Gestion en temps réel dans le coffre système'
                : 'Real-time credential store'}
            </span>
          </div>

          <div className="space-y-3">
            {keysList.map((item) => {
              const isMaster = item.key === MASTER_ADMIN_KEY;
              const isCurrent = currentUser?.accessKey === item.key;
              const isExpired = item.expiresAt && item.expiresAt < Date.now();

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-neutral-900/90 border-emerald-600 shadow-md ring-1 ring-emerald-500/30'
                      : item.status === 'revoked'
                      ? 'bg-neutral-950 border-neutral-800 opacity-60'
                      : item.status === 'suspended'
                      ? 'bg-neutral-950 border-amber-900/60'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: User Title & Key */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white font-mono">{item.label}</span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold">
                            {isFrench ? 'VOTRE SESSION ACTUELLE' : 'CURRENT SESSION'}
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            item.role === 'admin'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : item.role === 'trader'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {item.role}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                            item.status === 'active'
                              ? 'bg-emerald-950/80 text-emerald-400'
                              : item.status === 'suspended'
                              ? 'bg-amber-950/80 text-amber-400'
                              : 'bg-rose-950/80 text-rose-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Access Key String with Copy Button */}
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs text-neutral-200 select-all">
                          {item.key}
                        </code>
                        <button
                          onClick={() => handleCopy(item.key)}
                          title="Copier la clé"
                          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                        >
                          {copiedKey === item.key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {item.email && (
                        <div className="text-[11px] font-mono text-neutral-400">{item.email}</div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {!isCurrent && (
                        <button
                          onClick={() => handleSwitchToKey(item.key)}
                          disabled={item.status !== 'active'}
                          className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-mono transition"
                          title="Tester le bot avec ce compte utilisateur"
                        >
                          {isFrench ? 'Se connecter avec' : 'Switch to'}
                        </button>
                      )}

                      {!isMaster && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(item.id, item.status)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
                            title={
                              item.status === 'active'
                                ? 'Suspendre temporairement'
                                : 'Réactiver l’accès'
                            }
                          >
                            {item.status === 'active' ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>

                          {item.status !== 'revoked' && (
                            <button
                              onClick={() => handleRevoke(item.id)}
                              className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs transition"
                              title="Révoquer définitivement cette clé"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 transition"
                            title="Supprimer du registre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges / Metrics strip */}
                  <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-3 text-[11px] font-mono text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-emerald-400" />
                      <span>Plafond : {item.maxAllocatedBudgetUsd.toLocaleString()} USDT</span>
                    </span>

                    <span className="text-neutral-600">|</span>

                    <span className="flex items-center gap-1">
                      <ShieldCheck
                        className={`w-3 h-3 ${
                          item.canTradeLive ? 'text-emerald-400' : 'text-neutral-500'
                        }`}
                      />
                      <span>
                        Trading Réel :{' '}
                        <strong className={item.canTradeLive ? 'text-emerald-400' : 'text-neutral-400'}>
                          {item.canTradeLive ? 'AUTORISÉ' : 'VERROUILLÉ'}
                        </strong>
                      </span>
                    </span>

                    <span className="text-neutral-600">|</span>

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      <span>
                        {item.expiresAt
                          ? `Expire le : ${new Date(item.expiresAt).toLocaleDateString()}`
                          : 'Validité : Illimitée'}
                      </span>
                    </span>

                    {item.assignedBinanceApiKey && (
                      <>
                        <span className="text-neutral-600">|</span>
                        <span className="text-purple-400">Clés Binance gérées par Admin</span>
                      </>
                    )}
                  </div>

                  {item.notes && (
                    <div className="mt-2 text-[11px] text-neutral-500 italic">
                      Note : {item.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
