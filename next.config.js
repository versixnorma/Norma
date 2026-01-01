/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  // Desabilitar PWA em desenvolvimento para evitar cache indesejado
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Custom Service Worker path
  sw: 'sw.js',
  // Custom runtime caching rules (opcional, mas bom para Next.js)
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'https-calls',
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@versix/shared', '@versix/database'],
};

module.exports = withPWA(nextConfig);
