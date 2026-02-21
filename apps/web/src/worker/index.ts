/// <reference lib="webworker" />

// Utilizar 'self' com type assertion para evitar conflito de variáveis globais
const sw = self as unknown as ServiceWorkerGlobalScope;

// ============================================
// INSTALL / ACTIVATE
// ============================================
// Nota: skipWaiting já é gerenciado pelo next-pwa (skipWaiting: true no next.config.mjs).
// O activate com clients.claim() garante que o novo SW assume o controle imediatamente.
sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});

// ============================================
// FETCH — Delegado ao Workbox (next-pwa)
// ============================================
// O handler fetch customizado foi removido intencionalmente.
//
// Motivo: o next-pwa gera automaticamente handlers Workbox para todas as rotas
// configuradas em runtimeCaching (next.config.mjs). Ter um segundo raw listener
// que também chama event.respondWith() causava conflito (dupla tentativa de
// responder ao mesmo FetchEvent), tornando o comportamento do cache imprevisível
// e potencialmente quebrando requests de chunks JS após redeploys.
//
// O fallback para /offline em modo offline é tratado pelo workbox via:
//   fallbacks: { document: '/offline' }  ← next.config.mjs

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
