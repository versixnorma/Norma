'use client';

import { useMarketplace } from '@/hooks/useMarketplace';
import { useEffect, useMemo, useState } from 'react';

export function TransactionsTable() {
  const { transactions, loading, error, fetchTransactions } = useMarketplace();
  const [statusFilter, setStatusFilter] = useState('all');

  const handleExport = () => {
    if (!transactions.length) return;
    const header = [
      'id',
      'transaction_date',
      'partner_name',
      'discount_title',
      'condominio_nome',
      'final_amount',
      'commission_amount',
      'status',
    ];
    const rows = transactions.map((tx) => [
      tx.id,
      tx.transaction_date || '',
      tx.partner_name || '',
      tx.discount_title || '',
      tx.condominio_nome || '',
      tx.final_amount ?? '',
      tx.commission_amount ?? '',
      tx.status ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marketplace_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return transactions;
    return transactions.filter((tx) => tx.status === statusFilter);
  }, [transactions, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Transações</h1>
          <p className="text-sm text-gray-500">Acompanhe movimentações e comissões.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <span className="material-symbols-outlined">download</span>
            Exportar CSV
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 md:w-48"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Parceiro</th>
                <th className="px-4 py-3 text-left">Desconto</th>
                <th className="px-4 py-3 text-left">Condomínio</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {tx.transaction_date
                      ? new Date(tx.transaction_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {tx.partner_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {tx.discount_title || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {tx.condominio_nome || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                    R$ {Number(tx.final_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                    {tx.commission_amount ? `R$ ${Number(tx.commission_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
