'use client';

import dynamic from 'next/dynamic';
import { useEffect, type ReactNode } from 'react';

// Dynamic imports to save initial bundle size
const OfflineIndicator = dynamic(
  () => import('./OfflineIndicator').then((mod) => mod.OfflineIndicator),
  { ssr: false }
);
const UpdateAvailable = dynamic(
  () => import('./UpdateAvailable').then((mod) => mod.UpdateAvailable),
  { ssr: false }
);
const InstallPrompt = dynamic(() => import('./InstallPrompt').then((mod) => mod.InstallPrompt), {
  ssr: false,
});

// ============================================
// TYPE DEFINITIONS
// ============================================
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAProviderProps {
  children: ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Em desenvolvimento: desregistrar qualquer SW antigo para evitar
      // cache de assets (ex.: main-app.js, layout.css) que causam 404 e MIME text/html
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then(() => {
            console.log('[PWA] Service Worker desregistrado (modo dev)');
          });
        });
      });
      return;
    }

    // Registrar service worker apenas em produção
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration);
      })
      .catch((error) => {
        console.error('[PWA] Erro ao registrar Service Worker:', error);
      });

    // Detectar se está rodando como PWA
    const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigatorWithStandalone.standalone === true;

    if (isPWA) {
      console.log('[PWA] Aplicativo rodando em modo standalone');
    }
  }, []);

  return (
    <>
      {children}
      <OfflineIndicator />
      <UpdateAvailable />
      <InstallPrompt />
    </>
  );
}
