'use client';

import { PWAProvider } from '@/components/pwa/PWAProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { initSentry } from '@/lib/sentry';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { Toaster } from 'sonner';

const queryClient = new QueryClient();

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  useEffect(() => {
    initSentry();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const RELOAD_GUARD_KEY = 'norma:chunk-reload-once';
    // Armazena a URL onde ocorreu o erro para detectar se estamos no mesmo reload
    // ou em uma navegação genuína para outra página.
    const RELOAD_GUARD_URL_KEY = 'norma:chunk-reload-url';
    const CHUNK_ERROR_PATTERNS = [
      /ChunkLoadError/i,
      /Loading chunk [\d]+ failed/i,
      /Failed to fetch dynamically imported module/i,
      /Importing a module script failed/i,
    ];

    const shouldHandle = (message: string) =>
      CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));

    const reloadOnce = () => {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === '1';
      if (alreadyReloaded) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      // Guarda a URL corrente para distinguir reload vs navegação na limpeza do guard.
      sessionStorage.setItem(RELOAD_GUARD_URL_KEY, window.location.href);
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message = String(event.message || event.error?.message || '');
      if (shouldHandle(message)) reloadOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : String((reason as { message?: string } | null)?.message || '');
      if (shouldHandle(message)) reloadOnce();
    };

    // Limpa a trava SOMENTE quando o usuário navega para uma URL diferente da
    // que originou o erro. Isso impede o loop: chunk error → reload → pageshow
    // limpa trava → chunk error novamente → reload → loop infinito.
    const onPageShow = () => {
      const guardUrl = sessionStorage.getItem(RELOAD_GUARD_URL_KEY);
      if (guardUrl && guardUrl !== window.location.href) {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        sessionStorage.removeItem(RELOAD_GUARD_URL_KEY);
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <PWAProvider>{children}</PWAProvider>
          {/* P1 Accessibility Fix: Enhanced Toaster with ARIA support */}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1a1a2e',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              },
              className: 'toast-accessible',
              descriptionClassName: 'toast-description',
            }}
            duration={5000}
            gap={8}
            expand
            visibleToasts={3}
          />
          {/*
            P1 Accessibility: Live region for dynamic announcements
            This provides a fallback announcement mechanism for screen readers
          */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            id="toast-announcer"
            role="status"
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
