
import { logger } from '@/lib/logger';
// =====================================================
// SPRINT 10: SENTRY CONFIGURATION
// Error tracking & performance monitoring
// =====================================================

import type { SentryContext, SentryUser } from '@/types/observabilidade';
import * as Sentry from '@sentry/react';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

// =====================================================
// INITIALIZATION
// =====================================================

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN não configurado, monitoramento desabilitado');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `versix-norma@${APP_VERSION}`,

    // Tunelamento para evitar bloqueio por AdBlockers
    tunnel: '/api/sentry-tunnel',

    // Performance
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,

    // Session Replay
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0.5,
    replaysOnErrorSampleRate: 1.0,

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        maskAllInputs: true,
      }),
    ],

    // Filtros
    ignoreErrors: [
      // Browser quirks
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',

      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'NetworkError',

      // Chunk loading errors (durante deploy)
      /^ChunkLoadError/,
      'Loading chunk',
      'Loading CSS chunk',

      // Extensões de browser
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,

      // Navegação interrompida
      'AbortError',
      'The operation was aborted',
    ],

    denyUrls: [
      // Extensões
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,

      // Analytics e ads
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
      /facebook\.com/i,
    ],

    // Sanitização de dados sensíveis
    beforeSend(event, hint) {
      // Remover dados sensíveis do request
      if (event.request?.data) {
        try {
          const data = typeof event.request.data === 'string'
            ? JSON.parse(event.request.data)
            : event.request.data;

          const sensitiveFields = ['password', 'senha', 'cpf', 'telefone', 'token', 'api_key'];
          sensitiveFields.forEach(field => {
            if (data[field]) data[field] = '[REDACTED]';
          });

          event.request.data = JSON.stringify(data);
        } catch {
          // Ignorar erros de parse
        }
      }

      // Remover headers sensíveis
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          if (event.request!.headers![header]) {
            event.request!.headers![header] = '[REDACTED]';
          }
        });
      }

      return event;
    },

    // Breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Ignorar breadcrumbs de console em produção
      if (ENVIRONMENT === 'production' && breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },
  });

  logger.log('[Sentry] Inicializado:', { environment: ENVIRONMENT, version: APP_VERSION });
}

// =====================================================
// USER IDENTIFICATION
// =====================================================

export function identifyUser(user: SentryUser) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });

  Sentry.setTag('user_role', user.role);
  Sentry.setTag('condominio_id', user.condominioId);

  Sentry.setContext('user_context', {
    role: user.role,
    condominioId: user.condominioId,
  });
}

export function clearUser() {
  Sentry.setUser(null);
  Sentry.setTag('user_role', undefined);
  Sentry.setTag('condominio_id', undefined);
}

// =====================================================
// BREADCRUMBS
// =====================================================

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

export function addNavigationBreadcrumb(from: string, to: string) {
  addBreadcrumb('navigation', `${from} → ${to}`, { from, to });
}

export function addActionBreadcrumb(action: string, target?: string) {
  addBreadcrumb('user_action', action, { target });
}

// =====================================================
// ERROR CAPTURE
// =====================================================

export function captureError(
  error: Error,
  context?: SentryContext,
  level: Sentry.SeverityLevel = 'error'
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);

    if (context) {
      if (context.condominio_id) scope.setTag('condominio_id', context.condominio_id);
      if (context.usuario_id) scope.setTag('usuario_id', context.usuario_id);
      if (context.endpoint) scope.setTag('endpoint', context.endpoint);
      if (context.request_id) scope.setTag('request_id', context.request_id);

      scope.setExtras(context);
    }

    Sentry.captureException(error);
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message);
  });
}

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

export function startTransaction(
  name: string,
  op: string
) {
  return Sentry.startInactiveSpan({
    name,
    op,
    forceTransaction: true,
  });
}

export async function measureAsync<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    { name, op: operation },
    async () => {
      return await fn();
    }
  );
}

export function measureSync<T>(
  name: string,
  operation: string,
  fn: () => T
): T {
  return Sentry.startSpan(
    { name, op: operation },
    () => fn()
  );
}

// =====================================================
// CUSTOM METRICS
// =====================================================

export function setCustomMetric(name: string, value: number, unit?: string) {
  // Sentry.setMeasurement accepts string units - just pass directly
  Sentry.setMeasurement(name, value, unit);
}

// =====================================================
// FEATURE FLAGS
// =====================================================

export function setFeatureFlag(flag: string, value: boolean) {
  Sentry.setTag(`feature_${flag}`, value ? 'enabled' : 'disabled');
}

// =====================================================
// API ERROR TRACKING
// =====================================================

export function trackApiError(
  endpoint: string,
  method: string,
  statusCode: number,
  errorMessage?: string,
  requestId?: string
) {
  addBreadcrumb('api_error', `${method} ${endpoint} → ${statusCode}`, {
    endpoint,
    method,
    statusCode,
    errorMessage,
    requestId,
  }, 'error');

  if (statusCode >= 500) {
    captureMessage(`API Error: ${method} ${endpoint}`, 'error', {
      endpoint,
      method,
      statusCode,
      errorMessage,
      requestId,
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

export { Sentry };

// Re-export useful types
  export type { SeverityLevel } from '@sentry/react';

