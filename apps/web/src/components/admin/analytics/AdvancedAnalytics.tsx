'use client';

import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { TimeRangeSelector } from './TimeRangeSelector';
import { FunnelChart } from './FunnelChart';
import { CohortTable } from './CohortTable';
import { RetentionChart } from './RetentionChart';

const tabs = [
  { key: 'funnel' as const, label: 'Funil de Conversão' },
  { key: 'cohort' as const, label: 'Análise de Cohort' },
  { key: 'retention' as const, label: 'Retenção' },
];

export function AdvancedAnalytics() {
  const {
    activeTab,
    funnel,
    cohort,
    retention,
    loading,
    error,
    timeRange,
    setActiveTab,
    setTimeRange,
  } = useAdvancedAnalytics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics Avançado</h2>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {activeTab === 'funnel' && <FunnelChart data={funnel} loading={loading} />}
        {activeTab === 'cohort' && <CohortTable data={cohort} loading={loading} />}
        {activeTab === 'retention' && <RetentionChart data={retention} loading={loading} />}
      </div>

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        {activeTab === 'funnel' &&
          'O funil mostra a progressão dos usuários: Registro → Ativação (1+ ação) → Engajamento (5+ ações) → Retenção (ativo em ambas metades do período).'}
        {activeTab === 'cohort' &&
          'A análise de cohort agrupa usuários pelo mês de cadastro e mostra a porcentagem que permanece ativa nos meses seguintes.'}
        {activeTab === 'retention' &&
          'A curva de retenção mostra a porcentagem de usuários da primeira semana que continuam ativos nas semanas seguintes.'}
      </div>
    </div>
  );
}
