import React from 'react';
import {
  HelpCircle,
  X,
  Play,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  BarChart2,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface TestGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  lang: 'fr' | 'en';
}

export const TestGuideModal: React.FC<TestGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  lang,
}) => {
  if (!isOpen) return null;
  const isFrench = lang === 'fr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full p-6 text-neutral-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold font-mono text-white">
                {isFrench
                  ? 'GUIDE DE TEST & CONNEXIONS BINANCE / TELEGRAM'
                  : 'TESTING GUIDE & BINANCE / TELEGRAM INTEGRATIONS'}
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                {isFrench
                  ? 'Comment tester toutes les fonctionnalités et vérifier les connexions'
                  : 'How to test features and verify API links'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 my-5 text-xs font-mono">
          {/* Section 1: Comment le tester dès maintenant */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Play className="w-4 h-4" />
              <span>1. COMMENT TESTER L’APPLICATION DÈS MAINTENANT ?</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              L’application est prête à l’emploi sans nécessiter l’ouverture d’un terminal ni de risquer vos fonds :
            </p>

            <div className="grid gap-2.5">
              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    A. Tester la simulation en direct (Paper Trading)
                  </span>
                  <button
                    onClick={() => {
                      onNavigateTab('dashboard');
                      onClose();
                    }}
                    className="text-emerald-400 hover:underline text-[11px]"
                  >
                    Aller au Tableau de bord →
                  </button>
                </div>
                <p className="text-neutral-400 mt-1 text-[11px]">
                  Le bot tourne en direct avec un capital virtuel de 10 000 USDT. Observez vos positions ouvertes (dont l'<strong>Indice CAC 40 Paris</strong>, BTC, SOL),
                  leur P&L en direct, ou cliquez sur <strong>« ⚡ Tester Ordre CAC 40 »</strong> sur le tableau de bord pour tester instantanément l'exécution d'un trade protégé.
                </p>
              </div>

              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    B. Tester le Scanner Multi-Marchés (CAC 40, Indices, Crypto, Or)
                  </span>
                  <button
                    onClick={() => {
                      onNavigateTab('scanner');
                      onClose();
                    }}
                    className="text-sky-400 hover:underline text-[11px]"
                  >
                    Ouvrir le Scanner →
                  </button>
                </div>
                <p className="text-neutral-400 mt-1 text-[11px]">
                  Visualisez les 70+ actifs analysés en temps réel : <strong>l’Indice CAC 40 Paris</strong>, le <strong>DAX 40</strong>, le <strong>S&P 500</strong>, l’<strong>Or (Gold)</strong>, le <strong>Forex (EUR/USD)</strong> et toutes les paires crypto spot Binance. Utilisez la barre de filtre par marché pour isoler les indices ou actions en un clic.
                </p>
              </div>

              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    C. Tester le Backtest de Portefeuille multi-paires
                  </span>
                  <button
                    onClick={() => {
                      onNavigateTab('backtest');
                      onClose();
                    }}
                    className="text-amber-400 hover:underline text-[11px]"
                  >
                    Lancer un Backtest →
                  </button>
                </div>
                <p className="text-neutral-400 mt-1 text-[11px]">
                  Simulez les 60 derniers jours de marché avec les contraintes exactes du bot (5 positions max, frais 0.1%,
                  circuit breaker 5%). Vous pouvez exporter le résultat complet en fichier CSV.
                </p>
              </div>

              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-300">
                    D. Tester l’Arrêt d’Urgence (Kill-Switch)
                  </span>
                  <span className="text-neutral-500 text-[11px]">Bouton rouge en haut à droite</span>
                </div>
                <p className="text-neutral-400 mt-1 text-[11px]">
                  Cliquez sur « Arrêt d’urgence » pour tester soit le gel immédiat de toutes les nouvelles entrées,
                  soit la liquidation totale au marché de toutes les positions ouvertes.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Est-il relié à Binance & Clés d'Accès Administrateur ? */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>2. CONNEXION VRAI COMPTE BINANCE & CLÉS D’ACCÈS ADMIN</span>
            </div>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              <strong>L’application est dotée d’un contrôle d’accès strict et d’une intégration directe avec le moteur Binance Spot :</strong>
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400 text-[11px]">
              <li>
                <strong className="text-white">Clés d’accès générables uniquement par l’administrateur</strong> : Rendez-vous dans l’onglet <strong>« 🔑 Clés & Utilisateurs »</strong>. En tant qu’administrateur, vous pouvez générer des clés personnalisées pour chaque utilisateur (ex: <code>TRD-USER-XXXX</code>), définir leurs droits (accès au trading réel Binance, mode testnet, plafond budgétaire alloué, durée de validité).
              </li>
              <li>
                <strong className="text-white">Accueil de multiples utilisateurs</strong> : Chaque utilisateur peut se connecter avec sa clé d’accès via le sélecteur de session en haut à droite. Les utilisateurs disposent de leur propre espace avec permissions strictes.
              </li>
              <li>
                <strong className="text-white">Connexion réelle Binance Spot avec HMAC-SHA256</strong> : Dans l’onglet <strong>« ⚡ Binance Spot »</strong>, renseignez vos clés API Binance et cliquez sur <strong>« Connecter & Synchroniser les Vrais Soldes »</strong>. Vos soldes réels, commissions et permissions sont interrogés en direct.
              </li>
              <li>
                <strong className="text-white">Test d'ordre officiel (POST /api/v3/order/test)</strong> : Validez la conformité de vos ordres avec le moteur d’appariement officiel de Binance avec un risque financier de 0€.
              </li>
            </ul>
          </div>

          {/* Section 3: Progressive Web App (PWA) */}
          <div className="p-4 bg-neutral-950 border border-emerald-900/60 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>3. APPLICATION WEB PROGRESSIVE (PWA) & HORS-LIGNE</span>
            </div>
            <p className="text-neutral-300 leading-relaxed text-[11px]">
              Tradng_bot est une <strong>PWA autonome complète</strong> installable sur n'importe quel smartphone ou ordinateur :
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-400 text-[11px]">
              <li>
                <strong>Sur Ordinateur (Chrome / Edge / Safari macOS)</strong> : Cliquez sur le bouton vert <strong>« Installer PWA »</strong> dans le haut de page ou l’icône d’installation dans la barre d’adresse.
              </li>
              <li>
                <strong>Sur Mobile Android</strong> : Cliquez sur « Installer PWA » ou le menu Chrome ➔ « Ajouter à l’écran d’accueil ».
              </li>
              <li>
                <strong>Sur iPhone / iPad (iOS Safari)</strong> : Touchez Partager ➔ « Sur l’écran d’accueil ».
              </li>
              <li>
                <strong>Cache & Mode Hors-ligne</strong> : Le Service Worker met en cache les ressources afin que le bot reste consultable même en cas de coupure réseau temporaire.
              </li>
            </ul>
          </div>

          {/* Section 3: Est-il relié à Telegram ? */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <Send className="w-4 h-4" />
              <span>3. EST-IL RELIÉ À TELEGRAM ?</span>
            </div>
            <p className="text-neutral-300 leading-relaxed">
              <strong>Oui, l’application communique avec l’API officielle des bots Telegram :</strong>
            </p>
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded space-y-2">
              <div className="font-semibold text-white">Comment recevoir vos alertes sur votre smartphone :</div>
              <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-[11px]">
                <li>Ouvrez Telegram et cherchez le bot <code>@BotFather</code>. Tapez <code>/newbot</code> pour créer votre bot et copiez le <strong>Token</strong>.</li>
                <li>Envoyez un message à votre bot ou cherchez <code>@userinfobot</code> pour obtenir votre <strong>Chat ID</strong>.</li>
                <li>Rendez-vous dans l’onglet <strong>« Alertes Telegram »</strong> dans l’application.</li>
                <li>Collez votre Token et votre Chat ID, puis cliquez sur <strong>« Envoyer un message de test réel »</strong>.</li>
                <li>Vous recevrez instantanément une notification Telegram sur votre téléphone !</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">
            Tradng_bot v1.0 · Conforme au Cahier des charges du 21 octobre 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs rounded transition-colors"
          >
            {isFrench ? 'Compris, fermer' : 'Got it, close'}
          </button>
        </div>
      </div>
    </div>
  );
};
