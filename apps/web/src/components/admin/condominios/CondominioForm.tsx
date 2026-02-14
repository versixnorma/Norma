'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

type FormState = {
  nome: string;
  cnpj: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  tier: 'starter' | 'professional' | 'enterprise';
  total_unidades: string;
  telefone: string;
  email: string;
  logo_url: string;
  cor_primaria: string;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: '',
  cnpj: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  tier: 'starter',
  total_unidades: '',
  telefone: '',
  email: '',
  logo_url: '',
  cor_primaria: '#3B82F6',
  ativo: true,
};

interface CondominioFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<FormState>;
  condominioId?: string;
}

export function CondominioForm({ mode, initialValues, condominioId }: CondominioFormProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const cnpjTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = getSupabaseClient();
  const router = useRouter();

  const fetchCnpjData = useCallback(async (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return;

    setCnpjLoading(true);
    try {
      const res = await fetch(`/api/cnpj/${digits}`, { credentials: 'include' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 404) {
          toast.error('CNPJ nao encontrado na base da Receita Federal');
        } else {
          toast.error(body.error || 'Erro ao consultar CNPJ');
        }
        return;
      }

      const { data } = (await res.json()) as {
        data: {
          razao_social: string;
          nome_fantasia: string;
          endereco: string;
          numero: string;
          complemento: string;
          bairro: string;
          cidade: string;
          estado: string;
          cep: string;
          telefone: string;
          email: string;
        };
      };

      setForm((prev) => ({
        ...prev,
        nome: prev.nome || data.nome_fantasia || data.razao_social,
        endereco: data.endereco || prev.endereco,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        cidade: data.cidade || prev.cidade,
        estado: data.estado || prev.estado,
        cep: data.cep || prev.cep,
        telefone: data.telefone || prev.telefone,
        email: data.email || prev.email,
      }));

      toast.success('Dados do CNPJ preenchidos automaticamente');
    } catch {
      toast.error('Falha ao consultar CNPJ');
    } finally {
      setCnpjLoading(false);
    }
  }, []);

  const handleCnpjChange = (value: string) => {
    // Format CNPJ as user types: XX.XXX.XXX/XXXX-XX
    const digits = value.replace(/\D/g, '').slice(0, 14);
    let formatted = digits;
    if (digits.length > 12) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    } else if (digits.length > 8) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    } else if (digits.length > 5) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    setForm((prev) => ({ ...prev, cnpj: formatted }));

    // Auto-fetch when CNPJ is complete (14 digits)
    if (digits.length === 14) {
      if (cnpjTimeoutRef.current) clearTimeout(cnpjTimeoutRef.current);
      cnpjTimeoutRef.current = setTimeout(() => fetchCnpjData(digits), 300);
    }
  };

  const handleSave = async () => {
    if (!form.nome || !form.endereco || !form.bairro || !form.cidade || !form.estado || !form.cep) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    if (!form.total_unidades || Number(form.total_unidades) <= 0) {
      toast.error('Informe o total de unidades');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cnpj: form.cnpj || null,
        endereco: form.endereco.trim(),
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        estado: form.estado.trim().toUpperCase().slice(0, 2),
        cep: form.cep.trim(),
        tier: form.tier,
        total_unidades: Number(form.total_unidades),
        telefone: form.telefone || null,
        email: form.email || null,
        logo_url: form.logo_url || null,
        cor_primaria: form.cor_primaria || '#3B82F6',
        ativo: form.ativo,
      };

      if (mode === 'create') {
        const { data, error } = await supabase
          .from('condominios')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        toast.success('Condomínio criado');
        if (data?.id) router.push(`/admin/condominios/${data.id}`);
      } else {
        if (!condominioId) throw new Error('Condomínio inválido');
        const { error } = await supabase.from('condominios').update(payload).eq('id', condominioId);
        if (error) throw error;
        toast.success('Condomínio atualizado');
        router.push(`/admin/condominios/${condominioId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message || 'Erro ao salvar condomínio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Identificação</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-gray-500">Nome *</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">CNPJ</label>
            <div className="relative">
              <input
                value={form.cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="XX.XXX.XXX/XXXX-XX"
                maxLength={18}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
              />
              {cnpjLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Preencha o CNPJ para buscar dados automaticamente
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Endereço</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500">Endereço *</label>
            <input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Número</label>
            <input
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Complemento</label>
            <input
              value={form.complemento}
              onChange={(e) => setForm({ ...form, complemento: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Bairro *</label>
            <input
              value={form.bairro}
              onChange={(e) => setForm({ ...form, bairro: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Cidade *</label>
            <input
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Estado *</label>
            <input
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              maxLength={2}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">CEP *</label>
            <input
              value={form.cep}
              onChange={(e) => setForm({ ...form, cep: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Configurações</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Tier</label>
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value as FormState['tier'] })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Total Unidades *</label>
            <input
              type="number"
              min={1}
              value={form.total_unidades}
              onChange={(e) => setForm({ ...form, total_unidades: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Cor Primária</label>
            <input
              type="color"
              value={form.cor_primaria}
              onChange={(e) => setForm({ ...form, cor_primaria: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ativo"
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="ativo" className="text-xs text-gray-500">
              Condomínio ativo
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Contato</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-gray-500">Telefone</label>
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500">Logo (URL)</label>
            <input
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Salvando...' : mode === 'create' ? 'Criar condomínio' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
