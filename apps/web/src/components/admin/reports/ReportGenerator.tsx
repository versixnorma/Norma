'use client';

import { useState } from 'react';
import { useReportBuilder } from '@/hooks/useReportBuilder';

const reportTypes = [
  { value: 'executive', label: 'Executivo', description: 'KPIs gerais + saúde dos condominios' },
  {
    value: 'operational',
    label: 'Operacional',
    description: 'Atividade diária + métricas operacionais',
  },
  { value: 'financial', label: 'Financeiro', description: 'Custos, GMV e métricas financeiras' },
  { value: 'custom', label: 'Completo', description: 'Todas as seções combinadas' },
];

const formats = [
  { value: 'pdf' as const, label: 'PDF', icon: '📄' },
  { value: 'excel' as const, label: 'Excel', icon: '📊' },
  { value: 'csv' as const, label: 'CSV', icon: '📋' },
];

const timeRanges = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
];

export function ReportGenerator() {
  const { generating, error, generateReport } = useReportBuilder();
  const [reportType, setReportType] = useState('executive');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [timeRange, setTimeRange] = useState('30d');

  const handleGenerate = () => {
    const selectedType = reportTypes.find((t) => t.value === reportType);
    generateReport({
      reportType,
      format,
      title: `Relatório ${selectedType?.label || reportType}`,
      filters: { timeRange },
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gerar Relatório</h3>

      {/* Report Type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo de Relatório
        </label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                reportType === type.value
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">{type.label}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {type.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Formato
        </label>
        <div className="flex gap-3">
          {formats.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                format === f.value
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Período
        </label>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {timeRanges.map((tr) => (
            <option key={tr.value} value={tr.value}>
              {tr.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? 'Gerando...' : 'Gerar Relatório'}
      </button>
    </div>
  );
}
