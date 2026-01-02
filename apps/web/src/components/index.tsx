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
  () => import('./features/NormaChat').then((mod) => ({ default: mod.NormaChat })),
  {
    loading: () => <div className="rounded-lg bg-blue-50 p-4">Carregando Norma...</div>,
    ssr: false, // Carrega apenas no cliente
  }
);

// ============================================
// OBSERVABILIDADE
// ============================================
export const AlertasPanelDynamic = dynamic(
  () => import('./observabilidade/AlertasPanel').then((mod) => ({ default: mod.AlertasPanel })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando alertas...</div>
    ),
    ssr: true,
  }
);

export const MetricasCardsDynamic = dynamic(
  () => import('./observabilidade/MetricasCards').then((mod) => ({ default: mod.MetricasCards })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando métricas...</div>
    ),
    ssr: true,
  }
);

export const SystemStatusDynamic = dynamic(
  () => import('./observabilidade/SystemStatus').then((mod) => ({ default: mod.SystemStatus })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando status...</div>
    ),
    ssr: true,
  }
);

// ============================================
// FINANCEIRO
// ============================================
export const DashboardFinanceiroDynamic = dynamic(
  () =>
    import('./financeiro/DashboardFinanceiroCards').then((mod) => ({
      default: mod.DashboardFinanceiroCards,
    })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando dashboard...</div>
    ),
    ssr: true,
  }
);

// ============================================
// ASSEMBLEIAS
// ============================================
export const ResultadoVotacaoDynamic = dynamic(
  () => import('./assembleias/ResultadoVotacao').then((mod) => ({ default: mod.ResultadoVotacao })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando resultado...</div>
    ),
    ssr: true,
  }
);

// ============================================
// PWA
// ============================================
export const InstallPromptDynamic = dynamic(
  () => import('./pwa/InstallPrompt').then((mod) => ({ default: mod.InstallPrompt })),
  {
    loading: () => null,
    ssr: false,
  }
);

export const AccessibilityMenuDynamic = dynamic(
  () => import('./pwa/AccessibilityMenu').then((mod) => ({ default: mod.AccessibilityMenu })),
  {
    loading: () => null,
    ssr: false,
  }
);

// ============================================
// COMUNICAÇÃO
// ============================================
export const PreferenciasCanalsDynamic = dynamic(
  () =>
    import('./notificacoes/PreferenciasCanais').then((mod) => ({
      default: mod.PreferenciasCanais,
    })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando preferências...</div>
    ),
    ssr: true,
  }
);

// ============================================
// ADMIN
// ============================================
export const UserTableDynamic = dynamic(
  () => import('./admin/UserTable').then((mod) => ({ default: mod.UserTable })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando usuários...</div>
    ),
    ssr: false, // Admin tables often client-side heavy
  }
);

export const AuditLogViewerDynamic = dynamic(
  () => import('./admin/AuditLogViewer').then((mod) => ({ default: mod.AuditLogViewer })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando logs...</div>
    ),
    ssr: false,
  }
);

export const ApprovalListDynamic = dynamic(
  () => import('./admin/ApprovalList').then((mod) => ({ default: mod.ApprovalList })),
  {
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-50 p-4">Carregando aprovações...</div>
    ),
    ssr: false,
  }
);

// ============================================
// FEATURES
// ============================================
export const QuickAccessDynamic = dynamic(
  () => import('./features/QuickAccess').then((mod) => ({ default: mod.QuickAccess })),
  {
    loading: () => <div className="h-24 animate-pulse rounded-xl bg-gray-50"></div>,
    ssr: true,
  }
);

export const MuralDigitalDynamic = dynamic(
  () => import('./features/MuralDigital').then((mod) => ({ default: mod.MuralDigital })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-50"></div>,
    ssr: true,
  }
);

export const MarketplaceCarouselDynamic = dynamic(
  () =>
    import('./features/MarketplaceCarousel').then((mod) => ({ default: mod.MarketplaceCarousel })),
  {
    loading: () => <div className="h-48 animate-pulse rounded-xl bg-gray-50"></div>,
    ssr: true,
  }
);

// ============================================
// NOTIFICAÇÕES & EMERGÊNCIA
// ============================================
export const EmergenciaButtonDynamic = dynamic(
  () =>
    import('./notificacoes/EmergenciaButton').then((mod) => ({ default: mod.EmergenciaButton })),
  {
    loading: () => <div className="h-12 w-full animate-pulse rounded-xl bg-red-100"></div>,
    ssr: false,
  }
);
