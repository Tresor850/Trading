import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC<{ lang?: 'fr' | 'en' }> = ({ lang = 'fr' }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-mono font-medium text-black shadow-2xl animate-bounce">
      <WifiOff className="w-4 h-4 text-black shrink-0" />
      <span>
        {lang === 'fr'
          ? 'Mode Hors-Ligne (PWA) — Données en cache local utilisées'
          : 'Offline Mode (PWA) — Using cached local data'}
      </span>
    </div>
  );
};
