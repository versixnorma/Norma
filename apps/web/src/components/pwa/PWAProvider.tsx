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

    // Admin = sem SW. O painel é usado em desktop por gestores e não precisa de
    // funcionalidades PWA (offline, install, push). Manter o SW ativo no admin
    // é a causa raiz de F5 precisar de hard reset: o NavigationRoute do Workbox
    // intercepta navegações HTML antes de qualquer regra de cache ser avaliada.
    // Comportamento idêntico ao ambiente de desenvolvimento (SW desabilitado).
    const isAdmin = window.location.pathname.startsWith('/admin');
    if (isAdmin) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      // Limpar caches residuais que possam conter HTML obsoleto de admin.
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name === 'https-calls' || name === 'precache-v1' || name === 'others') {
            caches.delete(name);
          }
        });
      });
      return;
    }

    // Moradores e áreas públicas: registrar SW para suporte offline e PWA.
    // O worker (src/worker/index.ts) tem bypass para /admin/* como rede de segurança
    // caso clients.claim() do SW reclame um tab de admin aberto em paralelo.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado');

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(
                new CustomEvent('sw-update-available', { detail: registration })
              );
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[PWA] Falha ao registrar SW:', err);
      });

    // Detectar se está rodando como PWA instalada
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
