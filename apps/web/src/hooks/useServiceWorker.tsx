"use client";

import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/lib/logger';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => void;
  clearCache: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  subscribeToPush: (vapidPublicKey: string) => Promise<PushSubscription | null>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
    error: null,
  });

  // Verifica suporte inicial
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator;
    const isOnline = navigator.onLine;

    setState((prev) => ({ ...prev, isSupported, isOnline }));

    // Listeners de online/offline
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Registra SW automaticamente em produção
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      logger.log('[SW] Skipping registration in development');
      return;
    }

    registerServiceWorker();
  }, []);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      logger.log('[SW] Registered successfully:', registration.scope);

      // Verifica por atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.log('[SW] Update available');
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        }
      });

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        registration,
        error: null,
      }));

      // Verifica atualizações periodicamente (a cada 1 hora)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('[SW] Registration failed:', error);
      setState((prev) => ({
        ...prev,
        isRegistered: false,
        error: error as Error,
      }));
    }
  };

  const register = useCallback(async () => {
    await registerServiceWorker();
  }, []);

  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      const success = await state.registration.unregister();
      if (success) {
        logger.log('[SW] Unregistered successfully');
        setState((prev) => ({
          ...prev,
          isRegistered: false,
          registration: null,
        }));
      }
    } catch (error) {
      console.error('[SW] Unregistration failed:', error);
    }
  }, [state.registration]);

  const update = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      logger.log('[SW] Checked for updates');
    } catch (error) {
      console.error('[SW] Update check failed:', error);
    }
  }, [state.registration]);

  const skipWaiting = useCallback(() => {
    if (!state.registration?.waiting) return;

    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Recarrega a página quando o novo SW assumir
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, [state.registration]);

  const clearCache = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    logger.log('[SW] Cache clear requested');
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('[SW] Notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    logger.log('[SW] Notification permission:', permission);
    return permission;
  }, []);

  const subscribeToPush = useCallback(async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    if (!state.registration) {
      console.warn('[SW] No registration available');
      return null;
    }

    try {
      // Converte a chave VAPID para Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const subscription = await state.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      logger.log('[SW] Push subscription:', subscription.endpoint);
      return subscription;

    } catch (error) {
      console.error('[SW] Push subscription failed:', error);
      return null;
    }
  }, [state.registration]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
    clearCache,
    requestNotificationPermission,
    subscribeToPush,
  };
}

// ============================================
// COMPONENTE DE UPDATE PROMPT
// ============================================
export function UpdatePrompt() {
  const { isUpdateAvailable, skipWaiting } = useServiceWorker();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
            system_update
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 dark:text-white text-sm">
            Nova versão disponível!
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Atualize para ter acesso às melhorias.
          </p>
        </div>
        <button
          onClick={skipWaiting}
          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE DE OFFLINE INDICATOR
// ============================================
export function OfflineIndicator() {
  const { isOnline } = useServiceWorker();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
      <span className="material-symbols-outlined text-lg">cloud_off</span>
      Você está offline. Algumas funcionalidades podem estar limitadas.
    </div>
  );
}
