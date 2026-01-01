'use client';

import { logger } from '@/lib/logger';
import { recordNormaChatMetric, trackAsyncOperation } from '@/lib/metrics';
import { useCallback, useEffect } from 'react';

// =====================================================
// HOOKS PARA INSTRUMENTAÇÃO DE MÉTRICAS
// =====================================================

/**
 * Hook para rastrear performance do Norma Chat
 */
export function useNormaChatMetrics(condominioId: string, userId: string) {
  const trackMessage = useCallback(
    async (message: string, responseTime: number, hasSources: boolean, hadError: boolean, tokensUsed?: number) => {
      try {
        recordNormaChatMetric({
          name: 'norma_chat_message',
          condominioId,
          userId,
          messageLength: message.length,
          responseTime,
          hadError,
          hasSources,
          tokensUsed,
          value: responseTime,
          unit: 'millisecond',
        });

        logger.debug('[NormaChatMetrics]', {
          messageLength: message.length,
          responseTime,
          hasSources,
          hadError,
          tokensUsed,
        });
      } catch (error) {
        logger.error('[NormaChatMetrics Error]', error);
      }
    },
    [condominioId, userId]
  );

  return { trackMessage };
}

/**
 * Hook para rastrear operações financeiras
 */
export function useFinancialMetrics(condominioId: string) {
  const trackOperation = useCallback(
    async (
      operationType: 'view' | 'create' | 'update' | 'export',
      operation: () => Promise<unknown>,
      itemCount?: number,
      totalValue?: number
    ) => {
      try {
        await trackAsyncOperation(`financial_${operationType}`, operation, {
          condominio: condominioId,
          operation: operationType,
        });

        logger.debug('[FinancialMetrics]', {
          operationType,
          itemCount,
          totalValue,
        });
      } catch (error) {
        logger.error('[FinancialMetrics Error]', error);
      }
    },
    [condominioId]
  );

  return { trackOperation };
}

/**
 * Hook para rastrear eventos de Assembleia
 */
export function useAssembleiaMetrics(condominioId: string, assembleiaId: string) {
  const trackEvent = useCallback(
    async (eventType: 'vote' | 'view' | 'create' | 'finalize', operation: () => Promise<unknown>, participantsCount?: number) => {
      try {
        const startTime = performance.now();
        await operation();
        const processingTime = performance.now() - startTime;

        logger.debug('[AssembleiaMetrics]', {
          eventType,
          processingTime,
          participantsCount,
        });
      } catch (error) {
        logger.error('[AssembleiaMetrics Error]', error);
      }
    },
    []
  );

  return { trackEvent };
}

/**
 * Hook para rastrear Health Check
 */
export function useHealthCheck() {
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) {
          logger.warn('[HealthCheck] System degraded');
        }
      } catch (error) {
        logger.error('[HealthCheck] Failed', error);
      }
    };

    // Check health on mount
    checkHealth();

    // Check every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}

/**
 * Hook para rastrear performance de renderização
 */
export function useRenderMetrics(componentName: string) {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === componentName || entry.name.includes(componentName)) {
            logger.debug(`[RenderMetrics] ${componentName}`, {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });

      return () => observer.disconnect();
    }
  }, [componentName]);
}

/**
 * Hook para rastrear erros não capturados em componente
 */
export function useErrorTracking(componentName: string) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logger.error(`[ComponentError] ${componentName}`, event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error(`[UnhandledRejection] ${componentName}`, event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [componentName]);
}

const metricsHooks = {
  useNormaChatMetrics,
  useFinancialMetrics,
  useAssembleiaMetrics,
  useHealthCheck,
  useRenderMetrics,
  useErrorTracking,
};

export default metricsHooks;
