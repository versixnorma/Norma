'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f8fafc',
            color: '#1e293b',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1.5rem',
                backgroundColor: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '0.75rem',
              }}
            >
              Algo deu errado
            </h1>
            <p
              style={{
                color: '#64748b',
                marginBottom: '1.5rem',
                lineHeight: '1.5',
              }}
            >
              Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para
              resolver.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#0f3460',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e4a7a')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f3460')}
            >
              Tentar novamente
            </button>
            {error.digest && (
              <p
                style={{
                  marginTop: '1.5rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}
              >
                Código do erro: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
