import React, { useState } from 'react';
import { TelegramConfig } from '../types/trading';
import { sendTelegramMessageReal } from '../services/apiIntegrations';
import {
  Send,
  Bell,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  RefreshCw,
} from 'lucide-react';

interface TelegramTabProps {
  config: TelegramConfig;
  onUpdateConfig: (newConfig: Partial<TelegramConfig>) => void;
  lang: 'fr' | 'en';
}

export const TelegramTab: React.FC<TelegramTabProps> = ({
  config,
  onUpdateConfig,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const [botToken, setBotToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  // Mock stream of recent Telegram messages for live observability
  const [simulatedMessages, setSimulatedMessages] = useState<
    Array<{ id: string; timestamp: number; text: string }>
  >([
    {
      id: 'tg_1',
      timestamp: Date.now() - 3600 * 1000 * 5,
      text: '🟢 [Tradng_bot] ORDRE D’ACHAT EXÉCUTÉ\n• Paire : BTC/USDT\n• Prix : 89,800.00 USDT\n• Stop-Loss : 88,453.00 USDT (-1.5%)\n• Take-Profit : 92,494.00 USDT (+3.0%)\n• Taille : 1,975.60 USDT (20% équité)',
    },
    {
      id: 'tg_2',
      timestamp: Date.now() - 3600 * 1000 * 3,
      text: '🟢 [Tradng_bot] ORDRE D’ACHAT EXÉCUTÉ\n• Paire : SOL/USDT\n• Prix : 181.20 USDT\n• Stop-Loss : 178.48 USDT (-1.5%)\n• Take-Profit : 186.64 USDT (+3.0%)\n• Taille : 1,956.96 USDT (20% équité)',
    },
  ]);

  const handleSendTestMessage = async () => {
    setIsSending(true);
    setTestResult(null);

    const testText = `🔔 <b>[Tradng_bot v1.0] Message de Test</b>\n\n• Statut : <b>Connecté</b>\n• Chat ID : <code>${chatId}</code>\n• Heure : <i>${new Date().toLocaleTimeString('fr-FR', { timeZone: 'UTC' })} UTC</i>\n\nVotre bot est prêt à recevoir les alertes de trading spot multi-paires !`;

    const res = await sendTelegramMessageReal(botToken, chatId, testText);
    setIsSending(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: 'Message réel envoyé avec succès sur votre compte Telegram !',
      });
      const newMessage = {
        id: `tg_${Date.now()}`,
        timestamp: Date.now(),
        text: `🔔 [Tradng_bot] MESSAGE DE TEST ENVOYÉ EN DIRECT\n• Statut : Message ID #${res.messageId || 'OK'}\n• Chat ID : ${chatId}\n• Horodatage : ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'UTC' })} UTC`,
      };
      setSimulatedMessages((prev) => [newMessage, ...prev]);
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Erreur lors de l’envoi Telegram.',
      });
    }
  };

  const handleSave = () => {
    onUpdateConfig({
      botToken,
      chatId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Telegram Connection & Credentials */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                {isFrench ? 'CONNEXION TELEGRAM (EXIGENCE A1 & O5)' : 'TELEGRAM INTEGRATION'}
              </h3>
              <span className="text-xs text-neutral-400">
                {isFrench
                  ? 'Recevez les alertes en direct sur votre smartphone sans avoir à surveiller l’écran'
                  : 'Live instant alerts on smartphone'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-mono text-emerald-400">
              {config.isEnabled ? 'Alertes Actives' : 'Désactivé'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-xs font-mono">
          <div>
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Jeton du Bot Telegram (Bot Token)' : 'Bot Token'}
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              placeholder="7192841924:AAH3k_..."
            />
            <span className="text-[11px] text-neutral-500 mt-1 block">Créé via @BotFather sur Telegram</span>
          </div>

          <div>
            <label className="text-neutral-400 block mb-1">
              {isFrench ? 'Identifiant de conversation (Chat ID)' : 'Chat ID'}
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              placeholder="-100293847192"
            />
            <span className="text-[11px] text-neutral-500 mt-1 block">Votre compte perso ou groupe Telegram</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-neutral-800">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono rounded"
          >
            {isFrench ? 'Enregistrer les identifiants' : 'Save Credentials'}
          </button>

          <button
            onClick={handleSendTestMessage}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-medium rounded transition-colors disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-pulse' : ''}`} />
            <span>{isSending ? (isFrench ? 'Envoi en cours...' : 'Sending...') : (isFrench ? 'Envoyer un message de test réel' : 'Send Real Test Alert')}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-3 p-3 rounded text-xs font-mono flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/80 border border-rose-800 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Alert Events Selection (Requirement A2 & A3) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-800">
          <Bell className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold font-mono text-white">
            {isFrench ? 'ÉVÉNEMENTS ALERTÉS (SÉLECTIF & ANTI-SPAM)' : 'ALERT EVENTS & ANTI-SPAM'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={config.notifyEntries}
              onChange={(e) => onUpdateConfig({ notifyEntries: e.target.checked })}
              className="mt-0.5 accent-sky-500"
            />
            <div>
              <span className="font-semibold text-white block">Entrées en position</span>
              <span className="text-[11px] text-neutral-400">
                Paire, cours d’achat, stop-loss calculé et allocation en USDT.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={config.notifyExits}
              onChange={(e) => onUpdateConfig({ notifyExits: e.target.checked })}
              className="mt-0.5 accent-sky-500"
            />
            <div>
              <span className="font-semibold text-white block">Sorties de position (TP & SL)</span>
              <span className="text-[11px] text-neutral-400">
                Notification immédiate avec résultat net en $ et % après déduction des frais.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={config.notifyCircuitBreaker}
              onChange={(e) => onUpdateConfig({ notifyCircuitBreaker: e.target.checked })}
              className="mt-0.5 accent-rose-500"
            />
            <div>
              <span className="font-semibold text-rose-300 block">Coupe-circuit / Circuit breaker</span>
              <span className="text-[11px] text-neutral-400">
                Alerte d’urgence prioritaire si la perte de 5% est atteinte et le bot mis en pause 24h.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={config.notifyStartStop}
              onChange={(e) => onUpdateConfig({ notifyStartStop: e.target.checked })}
              className="mt-0.5 accent-sky-500"
            />
            <div>
              <span className="font-semibold text-white block">Démarrage et Arrêt du moteur</span>
              <span className="text-[11px] text-neutral-400">
                Tracé de l’état d’exécution, redémarrages automatiques et reprises après incident.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={config.antiSpamBatching}
              onChange={(e) => onUpdateConfig({ antiSpamBatching: e.target.checked })}
              className="mt-0.5 accent-sky-500"
            />
            <div>
              <span className="font-semibold text-white block">Protection anti-spam (Regroupement)</span>
              <span className="text-[11px] text-neutral-400">
                Regroupe les messages en un seul envoi quand plusieurs paires bougent en même temps.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 bg-neutral-950 border border-neutral-800 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={config.dailySummary}
              onChange={(e) => onUpdateConfig({ dailySummary: e.target.checked })}
              className="mt-0.5 accent-sky-500"
            />
            <div>
              <span className="font-semibold text-white block">Résumé quotidien automatique (00:00 UTC)</span>
              <span className="text-[11px] text-neutral-400">
                Rapport de fin de journée : P&L, positions ouvertes et exposition totale du portefeuille.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Simulated Live Telegram Messages Feed */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold font-mono text-white">
              {isFrench ? 'FLUX EN DIRECT DES ALERTES EXPÉDIÉES' : 'RECENT TELEGRAM DISPATCH LOG'}
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">Anti-spam actif</span>
        </div>

        <div className="mt-4 space-y-3 font-mono text-xs">
          {simulatedMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg text-neutral-200 whitespace-pre-line"
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
