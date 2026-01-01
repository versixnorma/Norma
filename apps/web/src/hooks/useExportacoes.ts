'use client';

/**
 * @deprecated This hook is deprecated because the 'exportacoes' table and 'criar_exportacao' RPC do not exist in the database schema.
 * Export functionality has been removed from the UI. This file is kept as a stub to prevent import errors.
 * See apps/web/src/app/sindico/integracoes/page.tsx for the updated implementation without export functionality.
 */

import { useCallback, useState } from 'react';

export function useExportacoes() {
  const [exportacoes] = useState([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const fetchExportacoes = useCallback(async (_condominioId: string) => {
    console.warn('useExportacoes.fetchExportacoes is deprecated - exportacoes table does not exist');
    return [];
  }, []);

  const criarExportacao = useCallback(async (_condominioId: string, _input: any) => {
    console.warn('useExportacoes.criarExportacao is deprecated - criar_exportacao RPC does not exist');
    return null;
  }, []);

  const downloadExportacao = useCallback(async (_id: string) => {
    console.warn('useExportacoes.downloadExportacao is deprecated');
    return null;
  }, []);

  return { exportacoes, loading, error, fetchExportacoes, criarExportacao, downloadExportacao };
}

