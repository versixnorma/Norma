'use client';

import { useNormaAI, type NormaConversation } from '@/hooks/useNormaAI';
import { useEffect, useMemo, useState } from 'react';

export function ConversationsTable() {
  const { conversations, loading, error, fetchConversations } = useNormaAI();
  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<NormaConversation | null>(null);

  useEffect(() => {
    fetchConversations({ limit: 100 });
  }, [fetchConversations]);

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const lower = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.message.toLowerCase().includes(lower) ||
        c.usuario_nome.toLowerCase().includes(lower) ||
        c.condominio_nome.toLowerCase().includes(lower)
    );
  }, [conversations, search]);

  const handleExport = () => {
    const csv = [
      ['Data', 'Usuário', 'Condomínio', 'Mensagem', 'Resposta'].join(','),
      ...filtered.map((c) =>
        [
          new Date(c.created_at).toLocaleDateString('pt-BR'),
          `"${c.usuario_nome}"`,
          `"${c.condominio_nome}"`,
          `"${c.message.replace(/"/g, '""')}"`,
          `"${c.response.replace(/"/g, '""').substring(0, 200)}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'norma_conversas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const truncate = (text: string, max: number) =>
    text.length > max ? text.substring(0, max) + '...' : text;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Histórico de conversas com a IA Norma
          </p>
        </div>
        <button
          onClick={handleExport}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Exportar CSV
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por mensagem, usuário ou condomínio..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Condomínio</th>
              <th className="px-4 py-3">Mensagem</th>
              <th className="px-4 py-3">Resposta</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && !conversations.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma conversa encontrada
                </td>
              </tr>
            ) : (
              filtered.map((conv) => (
                <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                    {new Date(conv.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{conv.usuario_nome}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {conv.condominio_nome}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-gray-600 dark:text-gray-300">
                    {truncate(conv.message, 80)}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-gray-600 dark:text-gray-300">
                    {truncate(conv.response, 80)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedConversation(conv)}
                      className="rounded p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      title="Ver detalhes"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Detalhes da Conversa */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalhes da Conversa
              </h2>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{new Date(selectedConversation.created_at).toLocaleString('pt-BR')}</span>
                <span>{selectedConversation.usuario_nome}</span>
                <span>{selectedConversation.condominio_nome}</span>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">Usuário</p>
                <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                  {selectedConversation.message}
                </p>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Norma</p>
                <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                  {selectedConversation.response}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
