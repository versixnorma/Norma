// @ts-check
import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  sw: 'sw.js',
  disable: process.env.NODE_ENV === 'development' || process.env.DISABLE_PWA === 'true',
  register: true,
  skipWaiting: true,
  // Desabilitar o cache dinâmico da start URL para evitar que o next-pwa injete
  // uma rota NetworkFirst para '/' que pode interferir no fluxo de auth SSR.
  dynamicStartUrl: false,
  cacheStartUrl: false,
  fallbacks: {
    document: '/offline',
  },
  buildExcludes: [
    /app-build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /_next\/static\/.*\.js\.map$/,
    /_next\/static\/chunks\/.*\.js\.map$/,
  ],
  customWorkerDir: 'src/worker',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Cacheia apenas REST e Storage do Supabase.
      // Rotas /auth/v1/* são excluídas intencionalmente — nunca cachear tokens
      // ou respostas de sessão para evitar servir credenciais expiradas do cache,
      // o que causaria o loop auth → login → dashboard em produção.
      urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|storage)\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutos (era 1 hora — muito agressivo)
        },
        networkTimeoutSeconds: 5, // era 10s — reduzido para não servir cache em cold start
      },
    },
  ],
});

// @ts-check
// Temporariamente desabilitando next-pwa para evitar conflitos
// import withPWAInit from 'next-pwa';

// const withPWA = withPWAInit({
//   dest: 'public',
//   disable: process.env.NODE_ENV === 'development',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development' || process.env.DISABLE_PWA === 'true',
//   fallbacks: {
//     document: '/offline',
//   },
//   buildExcludes: [
//     /app-build-manifest\.json$/,
//     /_buildManifest\.js$/,
//     /_ssgManifest\.js$/,
//     /_next\/static\/.*\.js\.map$/,
//     /_next\/static\/chunks\/.*\.js\.map$/,
//   ],
//   runtimeCaching: [
//     {
//       urlPattern: /^https:\/\/.*\/_next\/static\/.*/,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'next-static',
//         expiration: {
//           maxEntries: 200,
//           maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
//         },
//       },
//     },
//     {
//       urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
//       handler: 'CacheFirst',
//       options: {
//         cacheName: 'images',
//         expiration: {
//           maxEntries: 100,
//           maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
//         },
//       },
//     },
//   ],
// });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING: '1',
  },
  reactStrictMode: true,

  // Otimizações de performance para Lighthouse
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Otimização de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Otimizações de bundle e code-splitting
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    optimizePackageImports: [
      '@versix/shared',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'recharts',
      'sonner',
    ],
  },

  // Webpack config para melhor code-splitting
  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          // Vendor libraries separados
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Componentes UI/Radix
          ui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'ui-components',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Recharts para gráficos
          charts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'charts',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Código compartilhado da aplicação
          shared: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            name: 'shared',
          },
        },
      },
    };
    return config;
  },

  // Headers de segurança e performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      // Cache headers para assets estáticos
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache headers para imagens otimizadas
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Páginas admin: nunca cachear — o middleware verifica sessão a cada request.
      // Sem este header, o CDN ou o browser podem cachear respostas de redirect
      // (ex.: /admin/dashboard → /admin/login) e criar um loop eterno em produção.
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      // O arquivo sw.js deve ser sempre buscado fresh para garantir que o browser
      // detecte novas versões do Service Worker corretamente.
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Configurar sourcemaps para produção
    if (!dev && !isServer) {
      config.devtool = 'source-map';
    }

    // Otimizar bundle size em produção
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        radix: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          name: 'radix-ui',
          chunks: 'all',
          priority: 20,
        },
      };
    }

    return config;
  },
};

const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

// export default withPWA(nextConfig);
export default withBundleAnalyzer(
  withSentryConfig(withPWA(nextConfig), {
    silent: true,
    org: 'versix-solutions',
    project: 'versix-norma',
    // Upload sourcemaps automaticamente durante o build
    sourcemaps: {
      deleteSourcemapsAfterUpload: true,
    },
  })
);
