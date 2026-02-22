/* generated fallback sw.js */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('precache-v1').then((cache) => cache.addAll(['/', '/offline', '/manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// NetworkFirst strategy for HTTP requests
// Admin routes (/admin/*) nunca são interceptadas — sempre vão direto para a rede.
// Isso evita que o fallback SW sirva HTML obsoleto de admin após um redeploy.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Deixar rotas admin e auth passarem direto para a rede, sem cache.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth')) return;

  // Deixar navegações (HTML) passarem direto — só cachear assets estáticos.
  if (request.mode === 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open('https-calls');
        cache.put(request, response.clone()).catch(() => undefined);
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match('/offline');
        return offline || Response.error();
      }
    })()
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-critical-data') {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || 'Nova Notificacao';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'versix-norma-notification',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
