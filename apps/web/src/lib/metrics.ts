// =====================================================
// SENTRY METRICS INSTRUMENTATION
// =====================================================
// Coleta de métricas customizadas para funcionalidades críticas

import * as Sentry from '@sentry/react';
import { logger } from './logger';

// =====================================================
// TIPOS
// =====================================================

export interface MetricEvent {
  name: string;
  value?: number;
  unit?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  timestamp?: Date;
}

export interface NormaChatMetric extends MetricEvent {
  condominioId: string;
  userId: string;
  messageLength: number;
  responseTime: number;
  hadError: boolean;
  hasSources: boolean;
  tokensUsed?: number;
}

export interface FinancialMetric extends MetricEvent {
  condominioId: string;
  operationType: 'view' | 'create' | 'update' | 'export';
  itemCount?: number;
  totalValue?: number;
  processingTime: number;
}

export interface AssembleiaMetric extends MetricEvent {
  condominioId: string;
  assembleiaId: string;
  eventType: 'vote' | 'view' | 'create' | 'finalize';
  participantsCount?: number;
  processingTime: number;
}

// =====================================================
// INSTRUMENTATION HELPERS
// =====================================================

/**
 * Registra uma métrica customizada no Sentry
 */
export function recordMetric(event: MetricEvent) {
  try {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

    // Enviar para Sentry como span
    Sentry.startSpan(
      {
        name: `metric.${event.name}`,
        op: 'custom.metric',
        attributes: {
          metric: event.name,
          ...event.tags,
        },
      },
      (span) => {
        if (event.value !== undefined) {
          span?.setAttribute(`${event.name}.value`, event.value);
        }

        // Adicionar dados adicionais
        if (event.extra) {
          Object.entries(event.extra).forEach(([key, value]) => {
            span?.setAttribute(key, String(value));
          });
        }
      }
    );

    logger.debug(`[Metrics] ${event.name}`, {
      value: event.value,
      tags: event.tags,
    });
  } catch (err) {
    logger.error('[Metrics Error]', err);
  }
}

/**
 * Registra métrica de Norma Chat
 */
export function recordNormaChatMetric(metric: NormaChatMetric) {
  recordMetric({
    name: 'norma_chat_message',
    value: metric.responseTime,
    unit: 'millisecond',
    tags: {
      condominio: metric.condominioId,
      user: metric.userId,
      hasSources: metric.hasSources.toString(),
      hadError: metric.hadError.toString(),
    },
    extra: {
      messageLength: metric.messageLength,
      responseTime: metric.responseTime,
      tokensUsed: metric.tokensUsed,
    },
  });

  // Rastrear em span de performance
  const span = Sentry.getActiveSpan();
  if (span) {
    span.setAttribute('norma.messageLength', metric.messageLength);
    span.setAttribute('norma.responseTime', metric.responseTime);
    span.setAttribute('norma.tokensUsed', metric.tokensUsed || 0);
  }
}

/**
 * Registra métrica de operação financeira
 */
export function recordFinancialMetric(metric: FinancialMetric) {
  recordMetric({
    name: `financial_${metric.operationType}`,
    value: metric.processingTime,
    unit: 'millisecond',
    tags: {
      condominio: metric.condominioId,
      operation: metric.operationType,
    },
    extra: {
      itemCount: metric.itemCount,
      totalValue: metric.totalValue,
      processingTime: metric.processingTime,
    },
  });
}

/**
 * Registra métrica de Assembleia
 */
export function recordAssembleiaMetric(metric: AssembleiaMetric) {
  recordMetric({
    name: `assembleia_${metric.eventType}`,
    value: metric.processingTime,
    unit: 'millisecond',
    tags: {
      condominio: metric.condominioId,
      assembleia: metric.assembleiaId,
      event: metric.eventType,
    },
    extra: {
      participantsCount: metric.participantsCount,
      processingTime: metric.processingTime,
    },
  });
}

/**
 * Rastreia performance de operação assíncrona
 */
export async function trackAsyncOperation<T>(
  operationName: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = performance.now();

  return Sentry.startSpan(
    {
      name: operationName,
      op: 'async.operation',
      attributes: tags,
    },
    async (span) => {
      try {
        const result = await fn();
        const duration = performance.now() - startTime;

        span?.setAttribute('duration', duration);
        span?.setAttribute('status', 'ok');

        recordMetric({
          name: operationName,
          value: duration,
          unit: 'millisecond',
          tags: { success: 'true', ...tags },
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        span?.setAttribute('duration', duration);
        span?.setAttribute('status', 'error');
        span?.recordException(error instanceof Error ? error : new Error(String(error)));

        recordMetric({
          name: operationName,
          value: duration,
          unit: 'millisecond',
          tags: { success: 'false', error: String(error), ...tags },
        });

        throw error;
      }
    }
  );
}

/**
 * Cria um contexto Sentry com informações de usuário e condomínio
 */
export function setSentryContext(userId: string, condominioId: string, userData?: Record<string, unknown>) {
  Sentry.setUser({
    id: userId,
    ip_address: '{{auto}}',
  });

  Sentry.setContext('condominio', {
    id: condominioId,
  });

  Sentry.setContext('application', {
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    ...userData,
  });
}

/**
 * Captura exceção com contexto
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
  logger.error('[Sentry] Exception captured', error);
}

/**
 * Envia mensagem de breadcrumb para rastreamento
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Health check de serviços integrados
 */
export async function healthCheckServices(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {
    supabase: false,
    sentry: false,
    network: false,
  };

  try {
    // Check Sentry
    Sentry.startSpan(
      {
        op: 'healthcheck.sentry',
        name: 'Sentry Health Check',
      },
      (span) => {
        results.sentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
        span?.setAttribute('sentry_configured', results.sentry);
      }
    );

    // Check Network
    Sentry.startSpan(
      {
        op: 'healthcheck.network',
        name: 'Network Health Check',
      },
      async (span) => {
        try {
          const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
          results.network = response.ok;
          span?.setAttribute('network_ok', results.network);
        } catch {
          results.network = false;
          span?.setAttribute('network_ok', false);
        }
      }
    );

    return results;
  } catch (error) {
    captureException(error as Error, { context: 'healthCheckServices' });
    return results;
  }
}

// =====================================================
// SENTRY PROFILING
// =====================================================

/**
 * Marca início de operação para profiling
 */
export function startProfiling(name: string): () => void {
  let activeSpan: ReturnType<typeof Sentry.startSpan> | null = null;

  Sentry.startSpan(
    {
      name,
      op: 'profiling',
    },
    (span) => {
      activeSpan = span;
    }
  );

  return () => {
    if (activeSpan) {
      activeSpan = null;
    }
  };
}

// =====================================================
// EXPORT
// =====================================================

const metricsLib = {
  recordMetric,
  recordNormaChatMetric,
  recordFinancialMetric,
  recordAssembleiaMetric,
  trackAsyncOperation,
  setSentryContext,
  captureException,
  addBreadcrumb,
  healthCheckServices,
  startProfiling,
};

export default metricsLib;
