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
            // Accessibility: Announce toasts to screen readers
            richColors
            closeButton
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              },
              // Accessibility: Ensure proper contrast and focus
              className: 'toast-accessible',
              descriptionClassName: 'toast-description',
            }}
            // Duration for different toast types (ms)
            duration={5000}
            // Gap between toasts
            gap={8}
            // Accessibility: Toasts expand on hover for easier reading
            expand
            // Accessibility: Visible close button
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
