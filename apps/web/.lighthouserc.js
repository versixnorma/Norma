module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start',
      url: ['http://localhost:3000/'],
      numberOfRuns: 1, // Fast feedback for local/dev
      settings: {
        preset: 'desktop',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'csp-xss': 'off', // Often tricky with Next.js scripts
        'service-worker': 'off', // We check this in E2E
        'installable-manifest': 'off', // Checked in E2E
        'maskable-icon': 'off',
        'splash-screen': 'off',
        'themed-omnibox': 'off',
        'meta-viewport': 'off',
      },
    },
  },
};
