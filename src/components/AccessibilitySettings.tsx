// src/components/AccessibilitySettings.tsx

import { useState, useEffect } from 'react';
import { Eye, Type, Contrast, ZoomIn, Volume2 } from 'lucide-react';

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

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
}

const initialSettings: AccessibilitySettings = {
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
};

export function AccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>(initialSettings);
  
  // Aplicar configurações ao body
  useEffect(() => {
    const body = document.body;
    
    // 1. Tamanho da fonte (via CSS custom property ou classe)
    body.style.fontSize = {
      'normal': '16px',
      'large': '18px',
      'extra-large': '20px'
    }[settings.fontSize];
    
    // 2. Alto contraste
    if (settings.highContrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }
    
    // 3. Movimento reduzido
    if (settings.reducedMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }
    
    // 4. Modo leitor de tela (pode adicionar atributos ARIA globais ou classes)
    if (settings.screenReaderMode) {
      body.setAttribute('data-screen-reader-mode', 'true');
    } else {
      body.removeAttribute('data-screen-reader-mode');
    }
    
    // Salvar no localStorage
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
  }, [settings]);
  
  // Carregar configurações do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);
  
  return (
    <div className="space-y-6 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Eye className="w-6 h-6" />
        Acessibilidade
      </h2>
      
      {/* Tamanho da fonte */}
      <div>
        <label className="flex items-center gap-2 font-medium mb-3">
          <Type className="w-5 h-5" />
          Tamanho do texto
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['normal', 'large', 'extra-large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => setSettings({ ...settings, fontSize: size })}
              className={`p-3 rounded-xl border-2 transition-all ${
                settings.fontSize === size
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={{
                'normal': 'text-sm',
                'large': 'text-base',
                'extra-large': 'text-lg'
              }[size]}>
                Texto {size === 'normal' ? 'Normal' : size === 'large' ? 'Grande' : 'Muito Grande'}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Alto contraste */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <Contrast className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-medium">Alto contraste</p>
            <p className="text-sm text-gray-500">Melhora a visibilidade para baixa visão</p>
          </div>
        </div>
        <Switch
          checked={settings.highContrast}
          onCheckedChange={(checked) => 
            setSettings({ ...settings, highContrast: checked })
          }
        />
      </div>
      
      {/* Movimento reduzido */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <ZoomIn className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-medium">Reduzir animações</p>
            <p className="text-sm text-gray-500">Remove transições e efeitos visuais</p>
          </div>
        </div>
        <Switch
          checked={settings.reducedMotion}
          onCheckedChange={(checked) => 
            setSettings({ ...settings, reducedMotion: checked })
          }
        />
      </div>
      
      {/* Modo leitor de tela */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-medium">Otimizado para leitor de tela</p>
            <p className="text-sm text-gray-500">Melhora compatibilidade com VoiceOver/TalkBack</p>
          </div>
        </div>
        <Switch
          checked={settings.screenReaderMode}
          onCheckedChange={(checked) => 
            setSettings({ ...settings, screenReaderMode: checked })
          }
        />
      </div>
    </div>
  );
}
