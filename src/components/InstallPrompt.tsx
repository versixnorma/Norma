// src/components/InstallPrompt.tsx

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(isIOSDevice && !isStandalone);
    
    // Evento de instalação (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar após 30 segundos de uso
      setTimeout(() => setShowPrompt(true), 30000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('App instalado');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  // Mostrar prompt se for iOS (instruções manuais) ou se houver deferredPrompt (Android/Desktop)
  if (!showPrompt && !isIOS) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-4 z-50 animate-slide-up">
      <button 
        onClick={() => setShowPrompt(false)}
        className="absolute top-2 right-2 text-gray-400"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-indigo-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold">Instalar Versix Norma</h3>
          <p className="text-sm text-gray-600">
            Acesso rápido direto da tela inicial
          </p>
        </div>
        
        {isIOS ? (
          <div className="text-sm text-gray-600 max-w-[200px]">
            Toque em <span className="font-semibold">Compartilhar</span> e depois em{' '}
            <span className="font-semibold">"Adicionar à Tela de Início"</span>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium"
          >
            <Download className="w-4 h-4" />
            Instalar
          </button>
        )}
      </div>
    </div>
  );
}
