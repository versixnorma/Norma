// src/lib/push-notifications.ts

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { supabase } from '@/lib/supabase'; // Assumindo que existe um lib/supabase

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializa o Firebase (se ainda não estiver inicializado)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Evita erro de re-inicialização no Next.js
  console.error("Firebase initialization error:", e);
}

const messaging = app ? getMessaging(app) : null;

export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada');
      return null;
    }
    
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    });
    
    return token;
  } catch (error) {
    console.error('Erro ao obter token FCM:', error);
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  
  return onMessage(messaging, (payload) => {
    console.log('Mensagem recebida em foreground:', payload);
    callback(payload);
  });
}

// Salvar token no banco
export async function saveTokenToServer(token: string, userId: string) {
  const { data, error } = await supabase
    .from('usuarios_canais_preferencias')
    .select('fcm_tokens')
    .eq('usuario_id', userId)
    .single();

  let newTokens = data?.fcm_tokens || [];
  if (!newTokens.includes(token)) {
    newTokens.push(token);
  }

  const { error: upsertError } = await supabase
    .from('usuarios_canais_preferencias')
    .upsert({
      usuario_id: userId,
      fcm_tokens: newTokens
    }, {
      onConflict: 'usuario_id'
    });
  
  if (upsertError) {
    console.error('Erro ao salvar token FCM:', upsertError);
  }
}
