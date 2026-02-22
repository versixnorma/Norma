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

    // Limpar caches residuais do fallback sw.js de versões anteriores ao deploy atual.
    // Usuários com 'https-calls' ou 'precache-v1' no cache podem ter HTML de admin
    // cacheado pelo antigo sw.js. Esta limpeza é idempotente e roda apenas uma vez
    // porque o Workbox ativado já deleta esses caches via EXPECTED_CACHES no activate.
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name === 'https-calls' || name === 'precache-v1' || name === 'others') {
          caches.delete(name);
        }
      });
    });

    // Registrar o SW globalmente (escopo '/') em todas as rotas, incluindo admin.
    // O próprio worker (src/worker/index.ts) tem um listener de fetch que captura
    // /admin/* ANTES do Workbox e força cache: 'no-store', garantindo que F5 no
    // painel sempre vá à rede sem que o SW sirva dados obsoletos.
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado');

        // Detectar nova versão disponível
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
