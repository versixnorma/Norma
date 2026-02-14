/// <reference lib="webworker" />

// Self-unregistering service worker to replace stale/broken SW versions.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister().then(() => {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    });
  });
});
