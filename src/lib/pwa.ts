// src/lib/pwa.ts

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    registration: ServiceWorkerRegistration;
  }
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    
    window.registration = registration;
    
    // Verificar atualizações
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Nova versão disponível
          showUpdateAvailable(registration);
        }
      });
    });
    
    // Registrar periodic sync para dados críticos
    if ('periodicSync' in registration) {
      try {
        await (registration as any).periodicSync.register('update-critical-data', {
          minInterval: 12 * 60 * 60 * 1000 // 12 horas
        });
        await (registration as any).periodicSync.register('cache-cleanup', {
          minInterval: 24 * 60 * 60 * 1000 // 24 horas
        });
      } catch (error) {
        console.log('Periodic sync não disponível');
      }
    }
    
    return registration;
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    return null;
  }
}

function showUpdateAvailable(registration: ServiceWorkerRegistration) {
  // Mostrar toast ou banner de atualização
  const shouldUpdate = window.confirm(
    'Nova versão disponível! Deseja atualizar agora?'
  );
  
  if (shouldUpdate) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

// Verificar status de conectividade
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}
