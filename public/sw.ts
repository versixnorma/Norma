// public/sw.ts

import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
    CacheFirst,
    NetworkFirst,
    StaleWhileRevalidate
} from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Versão do cache
const CACHE_VERSION = 'v1.0.0';
const OFFLINE_CACHE = `offline-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const ASSETS_CACHE = `assets-${CACHE_VERSION}`;

// Limites de cache em MB
const CACHE_LIMITS = {
  assets: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60, maxSizeMB: 50 },
  images: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60, maxSizeMB: 20 },
  ocorrenciaPhotos: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60, maxSizeMB: 100 },
  documents: { maxEntries: 5, maxAgeSeconds: 90 * 24 * 60 * 60, maxSizeMB: 50 },
  apiResponses: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60, maxSizeMB: 10 },
  critical: { maxEntries: 5, maxAgeSeconds: 365 * 24 * 60 * 60, maxSizeMB: 5 }
};

// Limpar caches antigos
cleanupOutdatedCaches();

// =====================================================
// PRECACHING MANUAL - apenas assets essenciais
// =====================================================
const essentialAssets = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Precache apenas assets essenciais e confiáveis
precacheAndRoute(essentialAssets);

// =====================================================
// ESTRATÉGIA 1: Cache-First para assets estáticos
// =====================================================
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: ASSETS_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: CACHE_LIMITS.assets.maxEntries,
        maxAgeSeconds: CACHE_LIMITS.assets.maxAgeSeconds
      })
    ]
  })
);

// =====================================================
// ESTRATÉGIA 1.1: Cache-First para arquivos _next/static
// =====================================================
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({
    cacheName: 'next-static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 dias
      })
    ]
  })
);
// ESTRATÉGIA 3: Cache-First para fotos de ocorrências (maior, mas controlado)
// =====================================================
registerRoute(
  ({ url }) => url.pathname.includes('/storage/') &&
               url.pathname.includes('/ocorrencias/'),
  new CacheFirst({
    cacheName: 'ocorrencia-photos',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: CACHE_LIMITS.ocorrenciaPhotos.maxEntries,
        maxAgeSeconds: CACHE_LIMITS.ocorrenciaPhotos.maxAgeSeconds,
        purgeOnQuotaError: true
      })
    ]
  })
);

// =====================================================
// ESTRATÉGIA 4: Cache-First para documentos/PDFs
// =====================================================
registerRoute(
  ({ request }) =>
    request.destination === 'document' ||
    request.url.includes('.pdf'),
  new CacheFirst({
    cacheName: 'documents-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: CACHE_LIMITS.documents.maxEntries,
        maxAgeSeconds: CACHE_LIMITS.documents.maxAgeSeconds,
        purgeOnQuotaError: true
      })
    ]
  })
);

// =====================================================
// ESTRATÉGIA 5: Network-First para API
// =====================================================
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') ||
               url.origin.includes('supabase'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: CACHE_LIMITS.apiResponses.maxEntries,
        maxAgeSeconds: CACHE_LIMITS.apiResponses.maxAgeSeconds
      })
    ]
  })
);

// =====================================================
// ESTRATÉGIA 6: Stale-While-Revalidate para dados semi-estáticos
// =====================================================
registerRoute(
  ({ url }) =>
    url.pathname.includes('/faq') ||
    url.pathname.includes('/condominio') ||
    url.pathname.includes('/perfil'),
  new StaleWhileRevalidate({
    cacheName: 'semi-static',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50 })
    ]
  })
);

// =====================================================
// FALLBACK OFFLINE
// =====================================================
const OFFLINE_PAGE = '/offline';

// Precache da página offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => {
      return cache.addAll([
        OFFLINE_PAGE,
        '/icons/icon-192x192.png',
        '/offline-data.json' // Dados críticos offline (placeholder)
      ]);
    })
  );
});

// Navigation fallback
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        // Timeout de 10 segundos para evitar carregamento eterno
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(event.request, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        console.warn('[SW] Network request failed, serving offline page:', error);
        const cache = await caches.open(OFFLINE_CACHE);
        const offlineResponse = await cache.match(OFFLINE_PAGE);
        if (offlineResponse) {
          return offlineResponse;
        }
        // Fallback se a página offline não estiver no cache
        return new Response('Offline - Tente novamente quando estiver online', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  )
);

// =====================================================
// BACKGROUND SYNC para ações offline
// =====================================================
const bgSyncPlugin = new BackgroundSyncPlugin('offlineQueue', {
  maxRetentionTime: 24 * 60 // 24 horas em minutos
});

// Fila de ações offline (ocorrências, chamados)
registerRoute(
  ({ url, request }) =>
    (url.pathname.includes('/ocorrencias') ||
    url.pathname.includes('/chamados')) && request.method === 'POST',
  new NetworkFirst({
    cacheName: 'offline-actions',
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      notificationId: data.id
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Ignorar' }
    ],
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: data.priority === 'high'
  };

  // Notificação de emergência
  if (data.type === 'emergency') {
    options.vibrate = [200, 100, 200, 100, 200];
    options.requireInteraction = true;
    options.actions = [
      { action: 'sos', title: '🆘 Ver Emergência' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem uma janela aberta, foca nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Se não, abre nova janela
        return clients.openWindow(urlToOpen);
      })
  );
});

// =====================================================
// SINCRONIZAÇÃO DE DADOS CRÍTICOS (Placeholder)
// =====================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-critical-data') {
    // event.waitUntil(syncCriticalData()); // Implementação no lado do cliente
  }

  if (event.tag === 'sync-offline-actions') {
    // event.waitUntil(syncOfflineActions()); // Implementação no lado do cliente
  }
});

// =====================================================
// PERIODIC SYNC (para manter dados atualizados)
// =====================================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-critical-data') {
    // event.waitUntil(syncCriticalData()); // Implementação no lado do cliente
  }
  if (event.tag === 'cache-cleanup') {
    // event.waitUntil(cleanupOldCaches()); // Implementação no lado do cliente
  }
});

// =====================================================
// LIMPEZA PROATIVA DE CACHE (Placeholder para a lógica completa)
// =====================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpar caches antigos
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== OFFLINE_CACHE && !name.startsWith(CACHE_VERSION))
          .map(name => caches.delete(name))
      );

      // Claims all clients
      await clients.claim();
    })()
  );
});

// =====================================================
// MESSAGE HANDLING (para comunicação com o cliente)
// =====================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating new service worker');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches');
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[SW] All caches cleared');
      })()
    );
  }
});
