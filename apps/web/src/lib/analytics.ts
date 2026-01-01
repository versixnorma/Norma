// =====================================================
// SPRINT 10: ANALYTICS & METRICS
// Custom analytics tracking
// =====================================================

import type { AnalyticsEvent, WebVitals } from '@/types/observabilidade';
import { addBreadcrumb } from './sentry';
import { getSupabaseClient } from './supabase';

// =====================================================
// CONFIGURATION
// =====================================================

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 segundos

let eventQueue: AnalyticsEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// =====================================================
// WEB VITALS
// =====================================================

export function reportWebVitals(vitals: Partial<WebVitals>) {
  // Enviar para analytics
  Object.entries(vitals).forEach(([metric, value]) => {
    if (value !== undefined) {
      trackEvent('performance_metric', metric, { value, unit: 'ms' });
    }
  });

  // Log em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    import('@/lib/logger').then(({ logger }) => logger.log('[WebVitals]', vitals));
  }
}

// Integração com web-vitals library
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS((metric) => reportWebVitals({ CLS: metric.value }));
    onFCP((metric) => reportWebVitals({ FCP: metric.value }));
    onLCP((metric) => reportWebVitals({ LCP: metric.value }));
    onTTFB((metric) => reportWebVitals({ TTFB: metric.value }));
    onINP((metric) => reportWebVitals({ INP: metric.value }));
  });
}

// =====================================================
// EVENT TRACKING
// =====================================================

export function trackEvent(
  type: AnalyticsEvent['type'],
  name: string,
  properties?: Record<string, any>
) {
  const event: AnalyticsEvent = {
    type,
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  // Adicionar breadcrumb no Sentry
  addBreadcrumb('analytics', `${type}: ${name}`, properties);

  // Adicionar à fila
  eventQueue.push(event);

  // Flush se atingir batch size
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  }

  // Garantir flush periódico
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
  }
}

export function trackPageView(path: string, title?: string) {
  trackEvent('page_view', path, {
    title: title || document.title,
    referrer: document.referrer,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
  });
}

export function trackFeatureUsed(feature: string, details?: Record<string, any>) {
  trackEvent('feature_used', feature, details);
}

export function trackUserAction(action: string, target?: string, details?: Record<string, any>) {
  trackEvent('user_action', action, { target, ...details });
}

export function trackError(error: string, source?: string, details?: Record<string, any>) {
  trackEvent('error_occurred', error, { source, ...details });
}

// =====================================================
// BATCH PROCESSING
// =====================================================

async function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  try {
    // Enviar para Edge Function de analytics
    const { error } = await getSupabaseClient().functions.invoke('collect-analytics', {
      body: { events },
    });

    if (error) {
      console.error('[Analytics] Erro ao enviar eventos:', error);
      // Re-adicionar eventos à fila para retry
      eventQueue = [...events, ...eventQueue];
    }
  } catch (err) {
    console.error('[Analytics] Falha ao enviar eventos:', err);
    eventQueue = [...events, ...eventQueue];
  }
}

// Flush ao sair da página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Usar sendBeacon para garantir envio
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/collect-analytics`;
      navigator.sendBeacon(url, JSON.stringify({ events: eventQueue }));
    }
  });

  // Flush quando a página ficar invisível
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}

// =====================================================
// SESSION TRACKING
// =====================================================

let sessionId: string | null = null;
let sessionStart: Date | null = null;

export function initSession() {
  sessionId = crypto.randomUUID();
  sessionStart = new Date();

  trackEvent('user_action', 'session_start', {
    session_id: sessionId,
  });

  // Track session end
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (sessionId && sessionStart) {
        const duration = Date.now() - sessionStart.getTime();
        trackEvent('user_action', 'session_end', {
          session_id: sessionId,
          duration_ms: duration,
        });
      }
    });
  }

  return sessionId;
}

export function getSessionId() {
  return sessionId;
}

// =====================================================
// PERFORMANCE TIMING
// =====================================================

const timings = new Map<string, number>();

export function startTiming(name: string) {
  timings.set(name, performance.now());
}

export function endTiming(name: string, track = true): number | null {
  const start = timings.get(name);
  if (!start) return null;

  timings.delete(name);
  const duration = performance.now() - start;

  if (track) {
    trackEvent('performance_metric', name, {
      duration_ms: Math.round(duration),
    });
  }

  return duration;
}

// =====================================================
// FEATURE USAGE TRACKING
// =====================================================

const featureUsageCount = new Map<string, number>();

export function trackFeatureClick(feature: string) {
  const count = (featureUsageCount.get(feature) || 0) + 1;
  featureUsageCount.set(feature, count);

  // Só track no primeiro uso da sessão ou a cada 10 usos
  if (count === 1 || count % 10 === 0) {
    trackFeatureUsed(feature, { usage_count: count });
  }
}

// =====================================================
// ERROR RATE TRACKING
// =====================================================

let errorCount = 0;
let requestCount = 0;

export function trackApiRequest(success: boolean) {
  requestCount++;
  if (!success) errorCount++;

  // Report error rate a cada 100 requests
  if (requestCount % 100 === 0) {
    const errorRate = (errorCount / requestCount) * 100;
    trackEvent('performance_metric', 'api_error_rate', {
      error_rate: errorRate.toFixed(2),
      total_requests: requestCount,
      total_errors: errorCount,
    });
  }
}

export function getErrorRate(): number {
  return requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
}

// =====================================================
// CONSENT & PRIVACY
// =====================================================

let analyticsEnabled = true;

export function setAnalyticsEnabled(enabled: boolean) {
  analyticsEnabled = enabled;

  if (!enabled) {
    // Limpar fila
    eventQueue = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
}

export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

// =====================================================
// EXPORTS
// =====================================================

export const analytics = {
  init: initWebVitals,
  track: trackEvent,
  pageView: trackPageView,
  feature: trackFeatureUsed,
  action: trackUserAction,
  error: trackError,
  startTiming,
  endTiming,
  session: {
    init: initSession,
    getId: getSessionId,
  },
  api: {
    trackRequest: trackApiRequest,
    getErrorRate,
  },
  privacy: {
    setEnabled: setAnalyticsEnabled,
    isEnabled: isAnalyticsEnabled,
  },
};

export default analytics;
