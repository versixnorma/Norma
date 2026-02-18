import { copyFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const publicDir = path.resolve(process.cwd(), 'public');
const swPath = path.join(publicDir, 'sw.js');

async function run() {
  const files = await readdir(publicDir);

  // next-pwa with customWorkerDir gera worker com hash.
  const workerCandidates = files.filter((file) => /^worker-.*\.js$/u.test(file));
  if (workerCandidates.length === 0) {
    const fallbackSw = `/* generated fallback sw.js */
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
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

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
`;

    await writeFile(swPath, fallbackSw, 'utf8');
    console.log('[postbuild] sw.js fallback gerado (sem worker hash).');
    return;
  }

  const withStats = await Promise.all(
    workerCandidates.map(async (file) => ({
      file,
      mtimeMs: (await stat(path.join(publicDir, file))).mtimeMs,
    }))
  );

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latestWorker = withStats[0].file;

  await copyFile(path.join(publicDir, latestWorker), swPath);
  console.log(`[postbuild] sw.js atualizado a partir de ${latestWorker}`);
}

run().catch((error) => {
  console.error('[postbuild] Falha ao gerar sw.js:', error);
  process.exitCode = 1;
});
