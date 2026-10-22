import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  lang?: 'fr' | 'en';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang = 'fr' }) => {
  const isFrench = lang === 'fr';
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already running as an installed standalone PWA, hide or show small badge
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-[11px] font-mono text-emerald-400">
        <CheckCircle className="w-3 h-3 text-emerald-400" />
        <span>PWA Active</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow when beforeinstallprompt fired
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95 animate-pulse"
        title={isFrench ? "Installer l'application sur votre appareil" : 'Install App'}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="font-semibold">{isFrench ? 'Installer PWA' : 'Install PWA'}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium bg-neutral-900 border border-neutral-700 text-neutral-200 hover:bg-neutral-800 transition"
          title={isFrench ? 'Installer sur iPhone / iPad' : 'Install on iOS'}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isFrench ? 'Installer sur iOS' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-neutral-900 border border-neutral-700 p-6 shadow-2xl text-neutral-100">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold font-mono">
                    {isFrench ? 'Installer sur iPhone / iPad' : 'Install on iOS'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-neutral-300">
                <div className="flex items-start gap-3 p-2.5 bg-neutral-950 rounded border border-neutral-800">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold shrink-0 text-[10px]">
                    1
                  </span>
                  <div>
                    {isFrench ? (
                      <>
                        Touchez le bouton <strong className="text-white">Partager</strong> (<Share2 className="w-3 h-3 inline text-sky-400" />) dans la barre Safari.
                      </>
                    ) : (
                      <>
                        Tap the <strong className="text-white">Share</strong> button in Safari toolbar.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-neutral-950 rounded border border-neutral-800">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold shrink-0 text-[10px]">
                    2
                  </span>
                  <div>
                    {isFrench ? (
                      <>
                        Faites défiler vers le bas et sélectionnez{' '}
                        <strong className="text-emerald-400">Sur l’écran d’accueil</strong> (<PlusSquare className="w-3 h-3 inline text-emerald-400" />).
                      </>
                    ) : (
                      <>
                        Scroll down and tap <strong className="text-emerald-400">Add to Home Screen</strong>.
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-neutral-950 rounded border border-neutral-800">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold shrink-0 text-[10px]">
                    3
                  </span>
                  <div>
                    {isFrench
                      ? "Touchez Ajouter en haut à droite. L'icône Tradng_bot apparaîtra comme une vraie application !"
                      : "Tap Add in top right. The app will launch in full native standalone mode!"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded py-2 text-xs font-mono font-medium bg-emerald-700 hover:bg-emerald-600 text-white transition"
              >
                {isFrench ? 'Compris !' : 'Got it!'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop install button if user wants to see how to install or install manually
  return (
    <>
      <button
        onClick={() => setShowManualGuide(true)}
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
        title={isFrench ? 'Application Web Progressive (PWA)' : 'Progressive Web App'}
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span>PWA</span>
      </button>

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-700 p-6 shadow-2xl text-neutral-100">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono">
                  {isFrench ? 'Installation Progressive Web App (PWA)' : 'PWA App Installation'}
                </h3>
              </div>
              <button
                onClick={() => setShowManualGuide(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-300 font-sans">
              <p>
                {isFrench
                  ? 'Tradng_bot est une Progressive Web App complète certifiée, fonctionnant hors-ligne et installable sur Windows, macOS, Android et iOS.'
                  : 'Tradng_bot is a full Progressive Web App, operating offline and installable on Windows, macOS, Android, and iOS.'}
              </p>

              <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-2 font-mono text-[11px]">
                <div className="text-emerald-400 font-bold">
                  {isFrench ? '📱 Sur Mobile (Android / Chrome) :' : '📱 On Mobile (Android / Chrome):'}
                </div>
                <div>{isFrench ? 'Menu Chrome (⋮) ➔ "Ajouter à l’écran d’accueil"' : 'Chrome menu (⋮) ➔ "Add to Home Screen"'}</div>
                
                <div className="text-emerald-400 font-bold pt-2">
                  {isFrench ? '💻 Sur Ordinateur (Chrome / Edge / Brave) :' : '💻 On Desktop (Chrome / Edge / Brave):'}
                </div>
                <div>{isFrench ? 'Cliquez sur l’icône d’installation dans la barre d’adresse (en haut à droite ⤓)' : 'Click the install icon in your address bar (top right ⤓)'}</div>
              </div>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="mt-5 w-full rounded py-2 text-xs font-mono font-medium bg-neutral-800 hover:bg-neutral-700 text-white transition"
            >
              {isFrench ? 'Fermer' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
