'use client';

import { useNormaAI, type NormaDocument } from '@/hooks/useNormaAI';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';

type ModalType = 'manual' | null;

const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'regras', label: 'Regras' },
  { value: 'procedimentos', label: 'Procedimentos' },
  { value: 'faq', label: 'FAQ' },
  { value: 'emergencia', label: 'Emergência' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'manual', label: 'Manual' },
];

const SOURCE_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'upload', label: 'Upload PDF' },
  { value: 'manual', label: 'Manual' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'completed', label: 'Completo' },
  { value: 'processing', label: 'Processando' },
  { value: 'failed', label: 'Falhou' },
];

const EMPTY_FORM = {
  title: '',
  content: '',
  category: 'faq',
  tags: '',
};

export function KnowledgeTable() {
  const { documents, loading, error, fetchDocuments, createManualKnowledge, deleteDocument } =
    useNormaAI();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [filterSourceType, setFilterSourceType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = !search || doc.name.toLowerCase().includes(search.toLowerCase());
      const matchesSource = !filterSourceType || doc.source_type === filterSourceType;
      const matchesCategory = !filterCategory || doc.category === filterCategory;
      const matchesStatus = !filterStatus || doc.status === filterStatus;
      return matchesSearch && matchesSource && matchesCategory && matchesStatus;
    });
  }, [documents, search, filterSourceType, filterCategory, filterStatus]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    const userId = profile?.id;
    const condominioId = profile?.condominio_atual?.id;
    if (!userId || !condominioId) {
      setSaving(false);
      return;
    }
    await createManualKnowledge({
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      condominioId,
      userId,
    });
    setModal(null);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  const handleDelete = async (doc: NormaDocument) => {
    if (!confirm(`Deletar "${doc.name}" e todos os seus chunks?`)) return;
    await deleteDocument(doc.id);
  };

  const handleExport = () => {
    const csv = [
      ['Nome', 'Tipo', 'Origem', 'Categoria', 'Status', 'Chunks', 'Data'].join(','),
      ...filtered.map((d) =>
        [
          `"${d.name}"`,
          d.type,
          d.source_type,
          d.category || '',
          d.status,
          d.chunk_count,
          new Date(d.created_at).toLocaleDateString('pt-BR'),
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'norma_knowledge_base.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status === 'completed'
          ? 'Completo'
          : status === 'processing'
            ? 'Processando'
            : status === 'failed'
              ? 'Falhou'
              : status}
      </span>
    );
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Base de Conhecimento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie documentos e conhecimento da IA Norma
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => setModal('manual')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Novo Conhecimento
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <select
          value={filterSourceType}
          onChange={(e) => setFilterSourceType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          {SOURCE_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          {CATEGORIES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Chunks</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && !documents.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhum documento encontrado
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {doc.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-600 dark:text-gray-300">
                      {doc.source_type === 'upload'
                        ? 'PDF'
                        : doc.source_type === 'manual'
                          ? 'Manual'
                          : doc.source_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">
                    {doc.category || '-'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{doc.chunk_count}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(doc)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Deletar"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Conhecimento Manual */}
      {modal === 'manual' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Novo Conhecimento Manual
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Ex: Regras de uso da piscina"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categoria
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {CATEGORIES.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conteúdo
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Digite o conhecimento aqui. Quanto mais detalhado, melhor a IA responderá..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags (separar por vírgula)
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="piscina, regras, horário"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Processando...' : 'Criar Conhecimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
