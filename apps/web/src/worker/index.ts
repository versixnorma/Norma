/// <reference lib="webworker" />

// Utilizar 'self' com type assertion para evitar conflito de variáveis globais
const sw = self as unknown as ServiceWorkerGlobalScope;

// Importar utilitários se necessário (aqui mantemos simples para evitar deps complexas no worker)

sw.addEventListener('install', (event) => {
  console.log('[Worker] Instalando Service Worker customizado...');
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (event) => {
  console.log('[Worker] Ativando Service Worker customizado...');
  event.waitUntil(sw.clients.claim());
});

// ============================================
// CACHE STRATEGIES (NetworkFirst + precache)
// ============================================
const NETWORK_FIRST_HANDLER = 'NetworkFirst';
const HTTP_CACHE_NAME = 'https-calls';
const PRECACHE_NAME = 'precache-v1';
const PRECACHE_URLS = ['/', '/offline', '/manifest.json'];

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
  );
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(HTTP_CACHE_NAME);
        cache.put(request, networkResponse.clone()).catch(() => undefined);
        return networkResponse;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match('/offline');
        return offline || Response.error();
      }
    })()
  );
});

// ============================================
// BACKGROUND SYNC
// ============================================
sw.addEventListener('sync', (event) => {
  console.log('[Worker] Sync event disparado:', event.tag);

  if (event.tag === 'sync-critical-data') {
    event.waitUntil(syncCriticalData());
  }
});

async function syncCriticalData() {
  try {
    console.log('[Worker] Executando sincronização crítica em background...');

    // Notificar a aplicação que o sync começou (se houver clientes abertos)
    const clients = await sw.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_STARTED', timestamp: Date.now() });
    });

    // A lógica real de sync idealmente chama uma API endpoint dedicada
    // ou reprocessa filas do IndexedDB se conseguirmos acessar aqui.
    // Como o worker roda isolado, a estratégia mais comum é disparar um fetch
    // para um endpoint que processa a fila do servidor, ou apenas sinalizar.

    // Neste MVP, vamos simular o sucesso e permitir que o hook useOfflineSync
    // retome o controle quando o app estiver visível, ou usar BroadcastChannel.

    console.log('[Worker] Sincronização em background concluída.');
  } catch (error) {
    console.error('[Worker] Erro no sync:', error);
    throw error; // Reagendar
  }
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================
sw.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Nova Notificação';
    const options: NotificationOptions = {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || 'versix-norma-notification',
    } as any;

    event.waitUntil(sw.registration.showNotification(title, options));
  } catch (err) {
    console.error('[Worker] Erro ao processar push:', err);
  }
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Abrir app ao clicar
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return sw.clients.openWindow('/');
    })
  );
});

// Listen for client messages (e.g., SKIP_WAITING) to apply updates promptly
sw.addEventListener('message', (event: ExtendableMessageEvent) => {
  try {
    const data = event.data || {};
    if (data && data.type === 'SKIP_WAITING') {
      // Activate this worker immediately
      sw.skipWaiting().catch(() => undefined);
    }
  } catch (err) {
    console.error('[Worker] Error handling message:', err);
  }
});
