'use client';

import { useInstallPrompt } from '@/lib/pwa';
import { useState } from 'react';

export function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const wasDismissed = localStorage.getItem('install-prompt-dismissed');
    if (!wasDismissed) return false;
    const dismissedAt = parseInt(wasDismissed, 10);
    return Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setDismissed(true);
    }
  };

  // Não mostrar se já instalado ou dismissado
  if (isInstalled || dismissed) return null;

  // iOS: mostrar guia manual
  if (isIOS) {
    return (
      <>
        <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-2xl">install_mobile</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 dark:text-white">Instale o App</h3>
              <p className="text-sm text-gray-500 mt-1">Adicione à tela inicial para acesso rápido</p>
            </div>
            <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <span className="material-symbols-outlined text-gray-400">close</span>
            </button>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full mt-3 py-3 bg-primary text-white rounded-xl font-medium"
          >
            Ver como instalar
          </button>
        </div>

        {/* iOS Installation Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Como instalar no iPhone</h2>
                <button onClick={() => setShowIOSGuide(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
                  <div>
                    <p className="font-medium">Toque no botão de compartilhar</p>
                    <p className="text-sm text-gray-500">O ícone com a seta para cima na barra inferior</p>
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg inline-flex items-center gap-2">
                      <span className="material-symbols-outlined">ios_share</span>
                      <span className="text-sm">Compartilhar</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">2</div>
                  <div>
                    <p className="font-medium">Role para baixo e toque em</p>
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg inline-flex items-center gap-2">
                      <span className="material-symbols-outlined">add_box</span>
                      <span className="text-sm">Adicionar à Tela de Início</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">3</div>
                  <div>
                    <p className="font-medium">Toque em "Adicionar"</p>
                    <p className="text-sm text-gray-500">O app aparecerá na sua tela inicial</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setShowIOSGuide(false); handleDismiss(); }}
                className="w-full mt-6 py-3 bg-primary text-white rounded-xl font-medium"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android/Desktop: usar prompt nativo
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">install_mobile</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white">Instale o Versix Norma</h3>
          <p className="text-sm text-gray-500 mt-1">Acesso rápido e funciona offline</p>
        </div>
        <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <span className="material-symbols-outlined text-gray-400">close</span>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleDismiss} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium">
          Agora não
        </button>
        <button onClick={handleInstall} className="flex-1 py-3 bg-primary text-white rounded-xl font-medium">
          Instalar
        </button>
      </div>
    </div>
  );
}
