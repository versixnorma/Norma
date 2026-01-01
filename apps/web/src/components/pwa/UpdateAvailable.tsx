'use client';

import { useServiceWorkerUpdate } from '@/lib/pwa';

export function UpdateAvailable() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-green-600">update</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white">Atualização disponível</h3>
          <p className="text-sm text-gray-500 mt-1">Uma nova versão do app está pronta</p>
        </div>
      </div>
      <button
        onClick={applyUpdate}
        className="w-full mt-3 py-3 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">refresh</span>
        Atualizar agora
      </button>
    </div>
  );
}
