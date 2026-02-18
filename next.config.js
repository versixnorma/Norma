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

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
