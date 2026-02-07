'use client';

import { useMarketplace, type MarketplaceDiscount } from '@/hooks/useMarketplace';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type DiscountFormState = {
  title: string;
  partner_id: string;
  discount_type: string;
  discount_value: string;
  original_price: string;
  discounted_price: string;
  valid_from: string;
  valid_until: string;
  usage_limit: string;
  featured: boolean;
  status: string;
  description: string;
  terms: string;
  image_url: string;
};

const EMPTY_FORM: DiscountFormState = {
  title: '',
  partner_id: '',
  discount_type: 'percentage',
  discount_value: '',
  original_price: '',
  discounted_price: '',
  valid_from: '',
  valid_until: '',
  usage_limit: '',
  featured: false,
  status: 'active',
  description: '',
  terms: '',
  image_url: '',
};

export function DiscountsTable() {
  const {
    partners,
    discounts,
    loading,
    error,
    fetchPartners,
    fetchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
  } = useMarketplace();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MarketplaceDiscount | null>(null);
  const [form, setForm] = useState<DiscountFormState>(EMPTY_FORM);

  const handleExport = () => {
    if (!discounts.length) {
      toast.error('Nenhum desconto para exportar');
      return;
    }
    const header = [
      'title',
      'partner_id',
      'discount_type',
      'discount_value',
      'original_price',
      'discounted_price',
      'valid_from',
      'valid_until',
      'usage_limit',
      'featured',
      'status',
      'description',
      'terms',
      'image_url',
    ];
    const rows = discounts.map((d) => [
      d.title,
      d.partner_id,
      d.discount_type,
      d.discount_value,
      d.original_price ?? '',
      d.discounted_price ?? '',
      d.valid_from ?? '',
      d.valid_until ?? '',
      d.usage_limit ?? '',
      d.featured ? 'true' : 'false',
      d.status ?? '',
      d.description ?? '',
      d.terms ?? '',
      d.image_url ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marketplace_discounts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchPartners();
    fetchDiscounts();
  }, [fetchPartners, fetchDiscounts]);

  const categories = useMemo(() => {
    const set = new Set(partners.map((p) => p.category));
    return Array.from(set).filter(Boolean);
  }, [partners]);

  const filtered = useMemo(() => {
    let data = discounts;
    if (search) {
      const needle = search.toLowerCase();
      data = data.filter((d) => d.title.toLowerCase().includes(needle));
    }
    if (category !== 'all') {
      data = data.filter((d) => d.partner_category === category);
    }
    return data;
  }, [discounts, search, category]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (discount: MarketplaceDiscount) => {
    setEditing(discount);
    setForm({
      title: discount.title || '',
      partner_id: discount.partner_id || '',
      discount_type: discount.discount_type || 'percentage',
      discount_value: discount.discount_value ? String(discount.discount_value) : '',
      original_price: discount.original_price ? String(discount.original_price) : '',
      discounted_price: discount.discounted_price ? String(discount.discounted_price) : '',
      valid_from: discount.valid_from ? discount.valid_from.slice(0, 10) : '',
      valid_until: discount.valid_until ? discount.valid_until.slice(0, 10) : '',
      usage_limit: discount.usage_limit ? String(discount.usage_limit) : '',
      featured: !!discount.featured,
      status: discount.status || 'active',
      description: discount.description || '',
      terms: discount.terms || '',
      image_url: discount.image_url || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.partner_id) {
      toast.error('Preencha título e parceiro');
      return;
    }
    if (!form.discount_value) {
      toast.error('Informe o valor do desconto');
      return;
    }

    const payload = {
      title: form.title.trim(),
      partner_id: form.partner_id,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value || 0),
      original_price: form.original_price ? Number(form.original_price) : null,
      discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      featured: form.featured,
      status: form.status,
      description: form.description || null,
      terms: form.terms || null,
      image_url: form.image_url || null,
    };

    const result = editing
      ? await updateDiscount(editing.id, payload)
      : await createDiscount(payload);

    if (result) {
      toast.success(editing ? 'Desconto atualizado' : 'Desconto criado');
      setShowModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } else {
      toast.error('Erro ao salvar desconto');
    }
  };

  const handleDelete = async (discount: MarketplaceDiscount) => {
    if (!confirm(`Remover desconto "${discount.title}"?`)) return;
    const ok = await deleteDiscount(discount.id);
    if (ok) toast.success('Desconto removido');
    else toast.error('Erro ao remover desconto');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Descontos</h1>
          <p className="text-sm text-gray-500">Gerencie ofertas, validade e destaque.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <span className="material-symbols-outlined">download</span>
            Exportar CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Desconto
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar desconto..."
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 md:w-56"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Parceiro</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Valor</th>
                <th className="px-4 py-3 text-left">Validade</th>
                <th className="px-4 py-3 text-left">Destaque</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.map((discount) => (
                <tr key={discount.id}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    {discount.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {discount.partner_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {discount.discount_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {discount.discount_value}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {discount.valid_until
                      ? new Date(discount.valid_until).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {discount.featured ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        Destaque
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(discount)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(discount)}
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
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    Nenhum desconto encontrado
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
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {editing ? 'Editar Desconto' : 'Novo Desconto'}
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
                <label className="text-xs font-medium text-gray-500">Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Parceiro</label>
                <select
                  value={form.partner_id}
                  onChange={(e) => setForm({ ...form, partner_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                >
                  <option value="">Selecione</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Tipo</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                >
                  <option value="percentage">Percentual</option>
                  <option value="fixed">Valor Fixo</option>
                  <option value="service">Serviço</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Valor</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Validade Início</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Validade Fim</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Limite de Uso</label>
                <input
                  type="number"
                  min="0"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
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
                  <option value="expired">Expirado</option>
                </select>
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
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">Termos</label>
                <textarea
                  rows={2}
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500">Imagem (URL)</label>
                <input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="featured"
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="featured" className="text-xs text-gray-500">
                  Destacar desconto
                </label>
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
