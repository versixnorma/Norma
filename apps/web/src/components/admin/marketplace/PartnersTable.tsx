'use client';

import { useMarketplace, type MarketplacePartner } from '@/hooks/useMarketplace';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type PartnerFormState = {
  name: string;
  category: string;
  description: string;
  logo_url: string;
  website_url: string;
  contact_email: string;
  phone: string;
  address: string;
  commission_rate: string;
  status: string;
};

const EMPTY_FORM: PartnerFormState = {
  name: '',
  category: '',
  description: '',
  logo_url: '',
  website_url: '',
  contact_email: '',
  phone: '',
  address: '',
  commission_rate: '',
  status: 'active',
};

export function PartnersTable() {
  const { partners, loading, error, fetchPartners, createPartner, updatePartner, deletePartner } =
    useMarketplace();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MarketplacePartner | null>(null);
  const [form, setForm] = useState<PartnerFormState>(EMPTY_FORM);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const filtered = useMemo(() => {
    if (!search) return partners;
    const needle = search.toLowerCase();
    return partners.filter((p) => p.name.toLowerCase().includes(needle));
  }, [partners, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (partner: MarketplacePartner) => {
    setEditing(partner);
    setForm({
      name: partner.name || '',
      category: partner.category || '',
      description: partner.description || '',
      logo_url: partner.logo_url || '',
      website_url: partner.website_url || '',
      contact_email: partner.contact_email || '',
      phone: partner.phone || '',
      address: partner.address || '',
      commission_rate: partner.commission_rate ? String(partner.commission_rate) : '',
      status: partner.status || 'active',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category) {
      toast.error('Preencha nome e categoria');
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description || null,
      logo_url: form.logo_url || null,
      website_url: form.website_url || null,
      contact_email: form.contact_email || null,
      phone: form.phone || null,
      address: form.address || null,
      commission_rate: form.commission_rate ? Number(form.commission_rate) : null,
      status: form.status || 'active',
    };

    const result = editing
      ? await updatePartner(editing.id, payload)
      : await createPartner(payload);

    if (result) {
      toast.success(editing ? 'Parceiro atualizado' : 'Parceiro criado');
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } else {
      toast.error('Erro ao salvar parceiro');
    }
  };

  const handleDelete = async (partner: MarketplacePartner) => {
    if (!confirm(`Remover parceiro "${partner.name}"?`)) return;
    const ok = await deletePartner(partner.id);
    if (ok) toast.success('Parceiro removido');
    else toast.error('Erro ao remover parceiro');
  };

  const handleExport = () => {
    if (!partners.length) {
      toast.error('Nenhum parceiro para exportar');
      return;
    }
    const header = [
      'name',
      'category',
      'description',
      'commission_rate',
      'status',
      'contact_email',
      'phone',
      'website_url',
      'address',
      'logo_url',
    ];
    const rows = partners.map((p) => [
      p.name,
      p.category,
      p.description || '',
      p.commission_rate ?? '',
      p.status || '',
      p.contact_email || '',
      p.phone || '',
      p.website_url || '',
      p.address || '',
      p.logo_url || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marketplace_partners_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (content: string) => {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.replace(/(^"|"$)/g, '').trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.replace(/(^"|"$)/g, '').trim());
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = cols[i] || '';
      });
      return record;
    });
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const records = parseCsv(text);
      if (!records.length) {
        toast.error('CSV inválido');
        return;
      }
      let created = 0;
      for (const record of records) {
        if (!record.name || !record.category) continue;
        const result = await createPartner({
          name: record.name,
          category: record.category,
          description: record.description || null,
          commission_rate: record.commission_rate ? Number(record.commission_rate) : null,
          status: record.status || 'active',
          contact_email: record.contact_email || null,
          phone: record.phone || null,
          website_url: record.website_url || null,
          address: record.address || null,
          logo_url: record.logo_url || null,
        });
        if (result) created += 1;
      }
      toast.success(`Importação concluída: ${created} parceiros`);
    } catch {
      toast.error('Erro ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Parceiros Marketplace
          </h1>
          <p className="text-sm text-gray-500">Gerencie parceiros, contatos e comissões.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <span className="material-symbols-outlined">download</span>
            Exportar CSV
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900">
            <span className="material-symbols-outlined">
              {importing ? 'progress_activity' : 'upload'}
            </span>
            Importar CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Parceiro
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar parceiro..."
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
        />
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Comissão</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((partner) => (
                <tr key={partner.id}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {partner.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {partner.category}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {partner.commission_rate ? `${partner.commission_rate}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        partner.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {partner.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(partner)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(partner)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                    Nenhum parceiro encontrado
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editing ? 'Editar Parceiro' : 'Novo Parceiro'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Categoria</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Comissão (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.commission_rate}
                  onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Email</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Telefone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">Website</label>
                <input
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">Endereço</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">Descrição</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-primary px-4 py-2 font-medium text-white"
              >
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
