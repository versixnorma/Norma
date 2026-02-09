'use client';

import { useState } from 'react';
import type { ReportConfig } from '@/hooks/useReportBuilder';

interface ReportConfigurationsProps {
  configs: ReportConfig[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onCreate: (config: {
    name: string;
    reportType: string;
    format?: string;
    schedule?: string | null;
  }) => void;
}

export function ReportConfigurations({
  configs,
  loading,
  onDelete,
  onCreate,
}: ReportConfigurationsProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [reportType, setReportType] = useState('executive');
  const [format, setFormat] = useState('pdf');
  const [schedule, setSchedule] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, reportType, format, schedule });
    setName('');
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Relatórios Agendados
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg border border-blue-500 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          {showForm ? 'Cancelar' : 'Novo Agendamento'}
        </button>
      </div>

      {/* New config form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Nome
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do relatório"
                className="w-full rounded-md border px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Tipo
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="executive">Executivo</option>
                <option value="operational">Operacional</option>
                <option value="financial">Financeiro</option>
                <option value="custom">Completo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Formato
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Frequência
              </label>
              <select
                value={schedule || ''}
                onChange={(e) => setSchedule(e.target.value || null)}
                className="w-full rounded-md border px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Sem agendamento</option>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </form>
      )}

      {/* Configs list */}
      {configs.length === 0 ? (
        <div className="py-8 text-center text-gray-500">Nenhum relatório agendado</div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{config.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="capitalize">{config.report_type}</span>
                  <span>|</span>
                  <span className="uppercase">{config.format}</span>
                  {config.schedule && (
                    <>
                      <span>|</span>
                      <span className="capitalize">{config.schedule}</span>
                    </>
                  )}
                  {config.last_generated_at && (
                    <>
                      <span>|</span>
                      <span>
                        Último: {new Date(config.last_generated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    config.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {config.is_active ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={() => onDelete(config.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
