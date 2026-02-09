'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ReportConfig {
  id: string;
  name: string;
  report_type: string;
  metrics: string[];
  filters: Record<string, unknown>;
  format: 'pdf' | 'excel' | 'csv';
  schedule: string | null;
  recipients: string[];
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
}

export interface GeneratedReport {
  id: string;
  config_id: string | null;
  name: string;
  report_type: string;
  format: string;
  file_url: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  metadata: Record<string, unknown>;
  error_message: string | null;
  file_size_bytes: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ReportBuilderState {
  configs: ReportConfig[];
  history: GeneratedReport[];
  loading: boolean;
  generating: boolean;
  error: string | null;
}

export function useReportBuilder() {
  const [state, setState] = useState<ReportBuilderState>({
    configs: [],
    history: [],
    loading: false,
    generating: false,
    error: null,
  });

  const fetchConfigs = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/admin/reports/configurations');
      const json = await res.json();
      setState((prev) => ({ ...prev, configs: json.data || [], loading: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Erro',
        loading: false,
      }));
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports/history');
      const json = await res.json();
      setState((prev) => ({ ...prev, history: json.data || [] }));
    } catch {
      // silent
    }
  }, []);

  const createConfig = useCallback(
    async (config: {
      name: string;
      reportType: string;
      metrics?: string[];
      filters?: Record<string, unknown>;
      format?: string;
      schedule?: string | null;
      recipients?: string[];
    }) => {
      const res = await fetch('/api/admin/reports/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao criar configuração');
      }
      await fetchConfigs();
    },
    [fetchConfigs]
  );

  const deleteConfig = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/reports/configurations?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      await fetchConfigs();
    },
    [fetchConfigs]
  );

  const generateReport = useCallback(
    async (params: {
      reportType: string;
      format: 'pdf' | 'excel' | 'csv';
      title?: string;
      filters?: { timeRange: string };
    }) => {
      setState((prev) => ({ ...prev, generating: true, error: null }));
      try {
        const res = await fetch('/api/admin/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Erro ao gerar relatório');
        }

        // Download the file
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const contentDisposition = res.headers.get('Content-Disposition');
        const fileName = contentDisposition
          ? contentDisposition.split('filename="')[1]?.replace('"', '')
          : `relatorio.${params.format === 'excel' ? 'xlsx' : params.format}`;

        a.download = fileName || 'relatorio';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setState((prev) => ({ ...prev, generating: false }));
        await fetchHistory();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          generating: false,
          error: err instanceof Error ? err.message : 'Erro ao gerar',
        }));
      }
    },
    [fetchHistory]
  );

  useEffect(() => {
    fetchConfigs();
    fetchHistory();
  }, [fetchConfigs, fetchHistory]);

  return {
    ...state,
    fetchConfigs,
    fetchHistory,
    createConfig,
    deleteConfig,
    generateReport,
  };
}
