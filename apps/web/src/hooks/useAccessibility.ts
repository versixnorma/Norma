'use client';

import { useCallback, useEffect, useState } from 'react';

// ============================================
// ACCESSIBILITY SETTINGS
// ============================================
export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false
};

const STORAGE_KEY = 'versix-accessibility';

const FONT_SIZE_MAP = {
  normal: '16px',
  large: '18px',
  xlarge: '20px'
};

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const base = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      return {
        ...base,
        reducedMotion: base.reducedMotion || prefersReducedMotion,
        highContrast: base.highContrast || prefersHighContrast
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [loaded, setLoaded] = useState(() => typeof window !== 'undefined');

  // Aplicar configurações ao DOM
  useEffect(() => {
    if (!loaded) return;

    const root = document.documentElement;

    // Font size
    root.style.fontSize = FONT_SIZE_MAP[settings.fontSize];

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Screen reader mode
    if (settings.screenReaderMode) {
      root.setAttribute('data-screen-reader', 'true');
    } else {
      root.removeAttribute('data-screen-reader');
    }

    // Salvar
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage não disponível
    }
  }, [settings, loaded]);

  // Atualizar configuração
  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Aumentar fonte
  const increaseFontSize = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      fontSize: prev.fontSize === 'normal' ? 'large' : prev.fontSize === 'large' ? 'xlarge' : 'xlarge'
    }));
  }, []);

  // Diminuir fonte
  const decreaseFontSize = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      fontSize: prev.fontSize === 'xlarge' ? 'large' : prev.fontSize === 'large' ? 'normal' : 'normal'
    }));
  }, []);

  // Toggle high contrast
  const toggleHighContrast = useCallback(() => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  // Toggle reduced motion
  const toggleReducedMotion = useCallback(() => {
    setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  }, []);

  // Reset
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    loaded,
    updateSetting,
    increaseFontSize,
    decreaseFontSize,
    toggleHighContrast,
    toggleReducedMotion,
    resetSettings
  };
}

// ============================================
// CSS CLASSES TO ADD TO GLOBALS
// ============================================
/*
// Add to globals.css:

.high-contrast {
  --primary: #0000FF;
  --text: #000000;
  --bg: #FFFFFF;
  filter: contrast(1.2);
}

.high-contrast .dark {
  --primary: #00FFFF;
  --text: #FFFFFF;
  --bg: #000000;
}

.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

[data-screen-reader="true"] {
  // Enhanced focus styles
}

[data-screen-reader="true"] *:focus {
  outline: 3px solid var(--primary) !important;
  outline-offset: 2px !important;
}
*/
