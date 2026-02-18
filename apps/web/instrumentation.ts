import * as Sentry from '@sentry/nextjs';

export async function register() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [Sentry.httpIntegration()],
      tracesSampler: (samplingContext) => {
        if (!isProduction) return 1.0;
        const name = samplingContext.name || '';
        if (name.includes('/api/auth/')) return 1.0;
        if (name.includes('/api/admin/')) return 0.5;
        if (name.includes('/api/marketplace/')) return 0.5;
        return 0.2;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: isProduction ? 0.3 : 1.0,
      environment: process.env.NODE_ENV,
    });
  }
}
