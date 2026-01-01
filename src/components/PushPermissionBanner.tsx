// src/components/PushPermissionBanner.tsx

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission, saveTokenToServer } from '@/lib/push-notifications';
// import { useAuth } from '@/hooks/useAuth'; // Assumindo que existe um useAuth

// Mock do useAuth para evitar dependência externa
const useAuth = () => ({ user: { id: 'mock-user-id-123' } });

// Mock do componente Switch (shadcn/ui)
const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
  <button 
    role="switch" 
    aria-checked={checked} 
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export function PushPermissionBanner() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    // Mostrar banner se ainda não pediu permissão
    if ('Notification' in window && Notification.permission === 'default') {
      // Aguardar 5 segundos após login para mostrar
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleEnable = async () => {
    setLoading(true);
    
    const token = await requestNotificationPermission();
    
    if (token && user) {
      await saveTokenToServer(token, user.id);
    }
    
    setLoading(false);
    setShow(false);
  };
  
  if (!show) return null;
  
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-xl border p-4 z-50 animate-slide-up">
      <button 
        onClick={() => setShow(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-indigo-600" />
        </div>
        
        <div>
          <h3 className="font-semibold">Ativar notificações?</h3>
          <p className="text-sm text-gray-600 mt-1">
            Receba alertas de emergência, comunicados importantes e atualizações do condomínio.
          </p>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Ativando...' : 'Ativar'}
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
