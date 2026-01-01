import { useEffect } from 'react';
import { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { registerServiceWorker } from '@/lib/pwa';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PushPermissionBanner } from '@/components/PushPermissionBanner';
import '@/styles/globals.css'; // Assumindo que este arquivo existe
import '@/styles/accessibility.css'; // Importar o CSS de acessibilidade

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Registra o Service Worker apenas no lado do cliente
    if (typeof window !== 'undefined') {
      registerServiceWorker();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      {/* Componentes globais da Sprint 9 */}
      <InstallPrompt />
      <PushPermissionBanner />
    </QueryClientProvider>
  );
}

export default MyApp;
