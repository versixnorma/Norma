// Self-unregistering service worker - replaces stale next-pwa sw
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister().then(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.navigate(client.url));
    });
  });
});
