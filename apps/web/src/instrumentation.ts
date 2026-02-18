/**
 * Next.js Instrumentation Hook (Next.js 15+)
 * Inicializa Sentry no runtime Node.js via hook nativo — chamado uma única vez na startup.
 *
 * Referência: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development',
      release: `versix-norma@${process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.5'}`,

      // Amostragem granular: exclui health checks e rotas internas para reduzir ruído
      tracesSampler: ({ name, parentSampled }: { name: string; parentSampled?: boolean }) => {
        // Nunca amostrar rotas de monitoramento interno e assets do Next.js
        if (
          name.includes('/api/health') ||
          name.includes('/_next/') ||
          name.includes('/api/sentry-tunnel') ||
          name.includes('/functions/v1/health')
        )
          return 0;

        // Propagar decisão do span pai (distributed tracing)
        if (parentSampled !== undefined) return parentSampled ? 1 : 0;

        // Produção: 5% para API routes, 10% para páginas
        if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
          return name.startsWith('/api/') ? 0.05 : 0.1;
        }

        return 1.0; // 100% em desenvolvimento
      },

      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        'AbortError',
        'The operation was aborted',
        /^ChunkLoadError/,
        /^chrome-extension:\/\//,
        /^moz-extension:\/\//,
      ],

      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
        /^moz-extension:\/\//i,
      ],

      beforeSend(event) {
        // Nunca enviar eventos sem exception ou message (spans órfãos)
        if (!event.exception && !event.message) return null;
        return event;
      },
    });
  }
}
