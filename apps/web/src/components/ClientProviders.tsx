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
