'use client';

import { registerServiceWorker, requestNotificationPermission, subscribeToPush } from '@/lib/pwa';
import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function usePushNotifications() {
  const supabase = getSupabaseClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  // Verificar suporte
  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Verificar subscription existente
  useEffect(() => {
    if (!supported) return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setSubscription(sub);
      });
    });
  }, [supported]);

  // Solicitar permissão e assinar
  const enablePush = useCallback(async (): Promise<boolean> => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;
    setLoading(true);

    try {
      // 1. Pedir permissão
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        return false;
      }

      // 2. Registrar SW se necessário
      const registration = await registerServiceWorker();
      if (!registration) return false;

      // 3. Assinar push
      const sub = await subscribeToPush(registration, VAPID_PUBLIC_KEY);
      if (!sub) return false;

      setSubscription(sub);

      // 4. Salvar subscription no servidor
      const { error } = await supabase.rpc('registrar_fcm_token', {
        p_token: JSON.stringify(sub.toJSON()),
        p_provider: 'webpush'
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao habilitar push:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, supabase]);

  // Desabilitar push
  const disablePush = useCallback(async (): Promise<boolean> => {
    if (!subscription) return true;
    setLoading(true);

    try {
      // 1. Unsubscribe localmente
      await subscription.unsubscribe();

      // 2. Remover do servidor
      await supabase.rpc('remover_fcm_token', {
        p_token: JSON.stringify(subscription.toJSON())
      });

      setSubscription(null);
      return true;
    } catch (error) {
      console.error('Erro ao desabilitar push:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [subscription, supabase]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (permission !== 'granted') return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Teste Versix Norma', {
        body: 'Push notifications configuradas com sucesso!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test'
      });
      return true;
    } catch {
      return false;
    }
  }, [permission]);

  return {
    supported,
    permission,
    isSubscribed: !!subscription,
    loading,
    enablePush,
    disablePush,
    sendTestNotification
  };
}
