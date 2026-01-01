'use client';

import { useEffect } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  useEffect(() => {
    // Registrar service worker se suportado
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado:', registration);
        })
        .catch((error) => {
          console.error('[PWA] Erro ao registrar Service Worker:', error);
        });
    }

    // Detectar se está rodando como PWA
    const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  navigatorWithStandalone.standalone === true;

    if (isPWA) {
      console.log('[PWA] Aplicativo rodando em modo standalone');
    }
  }, []);

  return <>{children}</>;
}
