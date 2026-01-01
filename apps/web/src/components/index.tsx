// =====================================================
// DYNAMIC IMPORTS (Code-splitting)
// =====================================================
// Esta estratégia reduz o tamanho inicial do bundle ao carregar
// componentes pesados apenas quando necessário.

import dynamic from 'next/dynamic';

// ============================================
// NORMA CHAT
// ============================================
export const NormaChatDynamic = dynamic(
  () => import('./features/NormaChat').then(mod => ({ default: mod.NormaChat })),
  {
    loading: () => <div className="p-4 bg-blue-50 rounded-lg">Carregando Norma...</div>,
    ssr: false, // Carrega apenas no cliente
  }
);

// ============================================
// OBSERVABILIDADE
// ============================================
export const AlertasPanelDynamic = dynamic(
  () => import('./observabilidade/AlertasPanel').then(mod => ({ default: mod.AlertasPanel })),
  {
    loading: () => <div className="p-4 bg-gray-50 rounded-lg animate-pulse">Carregando alertas...</div>,
    ssr: true,
  }
);

export const MetricasCardsDynamic = dynamic(
  () => import('./observabilidade/MetricasCards').then(mod => ({ default: mod.MetricasCards })),
  {
    loading: () => <div className="p-4 bg-gray-50 rounded-lg animate-pulse">Carregando métricas...</div>,
    ssr: true,
  }
);

export const SystemStatusDynamic = dynamic(
  () => import('./observabilidade/SystemStatus').then(mod => ({ default: mod.SystemStatus })),
  {
    loading: () => <div className="p-4 bg-gray-50 rounded-lg animate-pulse">Carregando status...</div>,
    ssr: true,
  }
);

// ============================================
// FINANCEIRO
// ============================================
export const DashboardFinanceiroDynamic = dynamic(
  () => import('./financeiro/DashboardFinanceiroCards').then(mod => ({ default: mod.DashboardFinanceiroCards })),
  {
    loading: () => <div className="p-4 bg-gray-50 rounded-lg animate-pulse">Carregando dashboard...</div>,
    ssr: true,
  }
);

// ============================================
// ASSEMBLEIAS
// ============================================
export const ResultadoVotacaoDynamic = dynamic(
  () => import('./assembleias/ResultadoVotacao').then(mod => ({ default: mod.ResultadoVotacao })),
  {
    loading: () => <div className="p-4 bg-gray-50 rounded-lg animate-pulse">Carregando resultado...</div>,
    ssr: true,
  }
);

// ============================================
// PWA
// ============================================
export const InstallPromptDynamic = dynamic(
  () => import('./pwa/InstallPrompt').then(mod => ({ default: mod.InstallPrompt })),
  {
    loading: () => null,
    ssr: false,
  }
);

export const AccessibilityMenuDynamic = dynamic(
  () => import('./pwa/AccessibilityMenu').then(mod => ({ default: mod.AccessibilityMenu })),
  {
    loading: () => null,
    ssr: false,
  }
);

// ============================================
// COMUNICAÇÃO
// ============================================
export const PreferenciasCanalsDynamic = dynamic(
  () => import('./notificacoes/PreferenciasCanais').then(mod => ({ default: mod.PreferenciasCanais })),
  {
    loading: () => <div className="p-4 bg-gray-50 rounded-lg animate-pulse">Carregando preferências...</div>,
    ssr: true,
  }
);
