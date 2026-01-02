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
    const options: any = {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || 'versix-norma-notification',
    };

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
