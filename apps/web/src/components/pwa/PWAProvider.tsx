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

    // Páginas admin não precisam de PWA/offline.
    // Como next.config.mjs usa register: false, o SW NÃO é injetado automaticamente.
    // Aqui garantimos que qualquer SW residual de visitas anteriores seja removido,
    // e limpamos caches que podem conter HTML obsoleto de admin.
    const isAdmin = window.location.pathname.startsWith('/admin');
    if (isAdmin) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.unregister().then((ok) => {
            if (ok) console.log('[PWA] SW desregistrado (rota admin)');
          });
        });
      });
      // Limpar caches residuais do fallback sw.js e versões antigas.
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name === 'https-calls' || name === 'precache-v1' || name === 'others') {
            caches.delete(name).then(() => console.log('[PWA] Cache limpo:', name));
          }
        });
      });
      return;
    }

    // Em rotas não-admin: registrar o SW manualmente (next-pwa tem register: false).
    // Isso garante que o SW só esteja ativo em páginas públicas/offline-first.
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
