// =====================================================
// EXEMPLO DE MIGRAÇÃO: Code-Splitting em Componentes
// =====================================================

// FILE: apps/web/src/app/home/page.tsx

// ❌ ANTES (Code estático, maior bundle inicial):

// ✅ DEPOIS (Code-splitting, bundle otimizado):
// Nota: Componentes pequenos (<100 linhas) como AvatarMenu ainda podem ser estáticos

// =====================================================
// USO EM COMPONENTES
// =====================================================

// Substituir:
// <NormaChat isOpen={showNormaChat} onClose={() => setShowNormaChat(false)} />
//
// Por:
// <NormaChatDynamic isOpen={showNormaChat} onClose={() => setShowNormaChat(false)} />

// =====================================================
// INDICADORES PARA CODE-SPLITTING
// =====================================================

/**
 * Quando usar code-splitting (dynamic imports):
 * ✅ Componentes > 200 linhas
 * ✅ Componentes carregados em rutas específicas
 * ✅ Componentes opcionais/modais
 * ✅ Componentes com dependências pesadas
 *
 * Quando NÃO usar (imports estáticos):
 * ❌ Componentes < 100 linhas
 * ❌ Componentes críticos para FCP
 * ❌ Components that impact Core Web Vitals
 * ❌ Componentes no above-the-fold content
 */

// =====================================================
// COMPONENTES JÁ COM CODE-SPLITTING
// =====================================================

export const DYNAMIC_COMPONENTS = {
  // Observabilidade (peso total: 1000+ linhas)
  AlertasPanel: 'src/components/observabilidade/AlertasPanel.tsx (350 linhas)',
  MetricasCards: 'src/components/observabilidade/MetricasCards.tsx (338 linhas)',
  SystemStatus: 'src/components/observabilidade/SystemStatus.tsx (263 linhas)',

  // Features principais
  NormaChat: 'src/components/features/NormaChat.tsx (269 linhas)',
  DashboardFinanceiro: 'src/components/financeiro/DashboardFinanceiroCards.tsx (136 linhas)',

  // Notificações
  PreferenciasCanais: 'src/components/notificacoes/PreferenciasCanais.tsx (147 linhas)',

  // PWA
  InstallPrompt: 'src/components/pwa/InstallPrompt.tsx (147 linhas)',
  AccessibilityMenu: 'src/components/pwa/AccessibilityMenu.tsx (128 linhas)',

  // Assembleias
  ResultadoVotacao: 'src/components/assembleias/ResultadoVotacao.tsx (95 linhas)',
} as const;

// =====================================================
// PADRÃO RECOMENDADO
// =====================================================

/**
 * Para componentes dinâmicos, incluir loading skeleton:
 *
 * export const ComponentDynamic = dynamic(
 *   () => import('./Component').then(mod => ({ default: mod.Component })),
 *   {
 *     loading: () => (
 *       <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
 *         Carregando...
 *       </div>
 *     ),
 *     ssr: false, // para componentes que usam window/document
 *   }
 * );
 */

// =====================================================
// PRÓXIMOS PASSOS
// =====================================================

/**
 * 1. Migrar componentes pesados nas páginas principais
 *    - /home: NormaChat, QuickAccess
 *    - /admin/observabilidade: AlertasPanel, MetricasCards, SystemStatus
 *    - /financeiro: DashboardFinanceiro
 *
 * 2. Medir impacto com:
 *    - pnpm build (verificar First Load JS)
 *    - Lighthouse (FCP, LCP)
 *    - Bundle Analyzer
 *
 * 3. Target: Reduzir de 469 kB para ~380-400 kB
 */
