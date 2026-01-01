'use client';

import { useState } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';

export function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, increaseFontSize, decreaseFontSize, toggleHighContrast, toggleReducedMotion, resetSettings } = useAccessibility();

  return (
    <>
      {/* Botão flutuante de acessibilidade */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-transform"
        aria-label="Abrir menu de acessibilidade"
      >
        <span className="material-symbols-outlined">accessibility_new</span>
      </button>

      {/* Modal de acessibilidade */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div 
            className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">accessibility_new</span>
                Acessibilidade
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Tamanho da fonte */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Tamanho do texto</span>
                  <span className="text-sm text-gray-500 capitalize">{settings.fontSize}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={decreaseFontSize}
                    disabled={settings.fontSize === 'normal'}
                    className="flex-1 py-3 bg-white dark:bg-gray-600 rounded-lg font-medium disabled:opacity-50"
                    aria-label="Diminuir tamanho da fonte"
                  >
                    <span className="text-lg">A-</span>
                  </button>
                  <button
                    onClick={increaseFontSize}
                    disabled={settings.fontSize === 'xlarge'}
                    className="flex-1 py-3 bg-white dark:bg-gray-600 rounded-lg font-medium disabled:opacity-50"
                    aria-label="Aumentar tamanho da fonte"
                  >
                    <span className="text-2xl">A+</span>
                  </button>
                </div>
              </div>

              {/* Alto contraste */}
              <button
                onClick={toggleHighContrast}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                role="switch"
                aria-checked={settings.highContrast}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">contrast</span>
                  <div className="text-left">
                    <p className="font-medium">Alto contraste</p>
                    <p className="text-sm text-gray-500">Cores mais intensas</p>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full relative transition-colors ${settings.highContrast ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.highContrast ? 'left-6' : 'left-1'}`} />
                </div>
              </button>

              {/* Movimento reduzido */}
              <button
                onClick={toggleReducedMotion}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                role="switch"
                aria-checked={settings.reducedMotion}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">animation</span>
                  <div className="text-left">
                    <p className="font-medium">Reduzir animações</p>
                    <p className="text-sm text-gray-500">Menos movimento na tela</p>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full relative transition-colors ${settings.reducedMotion ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.reducedMotion ? 'left-6' : 'left-1'}`} />
                </div>
              </button>

              {/* Reset */}
              <button
                onClick={resetSettings}
                className="w-full py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
              >
                Restaurar padrões
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Skip link para navegação por teclado
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
    >
      Pular para o conteúdo principal
    </a>
  );
}
