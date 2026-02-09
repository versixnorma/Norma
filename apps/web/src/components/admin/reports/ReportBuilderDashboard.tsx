'use client';

import { useState } from 'react';
import { useReportBuilder } from '@/hooks/useReportBuilder';
import { ReportGenerator } from './ReportGenerator';
import { ReportHistory } from './ReportHistory';
import { ReportConfigurations } from './ReportConfigurations';

const tabs = [
  { key: 'generate' as const, label: 'Gerar Relatório' },
  { key: 'scheduled' as const, label: 'Agendados' },
  { key: 'history' as const, label: 'Histórico' },
];

type TabKey = (typeof tabs)[number]['key'];

export function ReportBuilderDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('generate');
  const { configs, history, loading, createConfig, deleteConfig } = useReportBuilder();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Relatórios</h2>

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
              {tab.key === 'scheduled' && configs.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                  {configs.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {activeTab === 'generate' && <ReportGenerator />}
        {activeTab === 'scheduled' && (
          <ReportConfigurations
            configs={configs}
            loading={loading}
            onDelete={deleteConfig}
            onCreate={createConfig}
          />
        )}
        {activeTab === 'history' && <ReportHistory reports={history} loading={loading} />}
      </div>
    </div>
  );
}
