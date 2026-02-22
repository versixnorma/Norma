'use client';

import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { condominioFormSchema, type CondominioFormInput } from '@/lib/schemas/condominioForm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const AREAS_PRESET = [
  'Piscina',
  'Salão de Festas',
  'Academia',
  'Churrasqueira',
  'Playground',
  'Quadra Esportiva',
  'Salão de Jogos',
  'Espaço Gourmet',
  'Pet Place',
  'Brinquedoteca',
  'Espaço Coworking',
  'Bicicletário',
  'Lavanderia Coletiva',
  'Sauna',
  'Quadra de Tênis',
  'Espaço Zen',
  'Salão de Beleza',
  'Garagem de Serviço',
];

const DEFAULT_AREAS = new Set(['Piscina', 'Salão de Festas', 'Academia', 'Churrasqueira']);

export default function NovoCondominioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cnpjLookingUp, setCnpjLookingUp] = useState(false);
  const [cepLookingUp, setCepLookingUp] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(DEFAULT_AREAS));
  const [customArea, setCustomArea] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<CondominioFormInput>({
    resolver: zodResolver(condominioFormSchema),
    defaultValues: {
      dia_vencimento: 10,
      blocos: [
        { nome: 'Bloco A', unidades: 20 },
        { nome: 'Bloco B', unidades: 20 },
      ],
      areas_comuns_string: Array.from(DEFAULT_AREAS).join(', '),
      modules: {
        financeiro: true,
        assembleias: true,
        comunicacao: true,
        norma_ai: true,
      },
    },
  });

  const {
    fields: blocoFields,
    append: addBloco,
    remove: removeBloco,
  } = useFieldArray({
    control,
    name: 'blocos',
  });

  const watchedBlocos = watch('blocos') || [];
  const totalUnidades = watchedBlocos.reduce((acc, b) => acc + (Number(b?.unidades) || 0), 0);

  // Sync selected + custom areas into the hidden form field
  const syncAreas = useCallback(
    (selected: Set<string>, custom: string) => {
      const customItems = custom
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const all = [...Array.from(selected), ...customItems];
      setValue('areas_comuns_string', all.join(', '));
    },
    [setValue]
  );

  const toggleArea = (area: string) => {
    const next = new Set(selectedAreas);
    if (next.has(area)) next.delete(area);
    else next.add(area);
    setSelectedAreas(next);
    syncAreas(next, customArea);
  };

  const handleCustomAreaChange = (val: string) => {
    setCustomArea(val);
    syncAreas(selectedAreas, val);
  };

  // CNPJ auto-fill via BrasilAPI
  const handleCNPJBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cnpj = e.target.value.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    setCnpjLookingUp(true);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!r.ok) {
        toast.error('CNPJ não encontrado na Receita Federal');
        return;
      }
      const info = await r.json();
      // Razão social e nome fantasia
      if (info.nome) setValue('razao_social', info.nome);
      if (info.fantasia) setValue('nome', info.fantasia);
      // Endereço
      if (info.logradouro) setValue('logradouro', info.logradouro);
      if (info.numero) setValue('numero', String(info.numero));
      if (info.complemento) setValue('complemento', info.complemento);
      if (info.bairro) setValue('bairro', info.bairro);
      if (info.municipio) setValue('cidade', info.municipio);
      if (info.uf) setValue('estado', info.uf);
      if (info.cep) setValue('cep', String(info.cep).replace(/\D/g, ''));
      // Contato
      if (info.telefone) setValue('telefone', info.telefone);
      if (info.email) setValue('email_administrativo', info.email);
      toast.success('Dados preenchidos via CNPJ');
    } catch {
      toast.error('Não foi possível consultar o CNPJ');
    } finally {
      setCnpjLookingUp(false);
    }
  };

  // CEP auto-fill via ViaCEP
  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLookingUp(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!r.ok) return;
      const json = await r.json();
      if (json.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      if (json.logradouro) setValue('logradouro', json.logradouro);
      if (json.bairro) setValue('bairro', json.bairro);
      if (json.localidade) setValue('cidade', json.localidade);
      if (json.uf) setValue('estado', json.uf);
      toast.success('Endereço preenchido via CEP');
    } catch {
      // ignore
    } finally {
      setCepLookingUp(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path', `condominios/logos/${Date.now()}-${file.name}`);
      const resp = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await resp.json();
      if (json?.data?.url) {
        setValue('logo_url', json.data.url);
        setLogoPreview(json.data.url);
        toast.success('Logo enviado');
      } else {
        toast.error(json?.error || 'Erro ao enviar logo');
      }
    } catch {
      toast.error('Erro ao enviar logo');
    } finally {
      setLogoUploading(false);
    }
  };

  async function onSubmit(data: CondominioFormInput) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/condominios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Erro ao criar condomínio');
      }
      toast.success('Condomínio criado com sucesso');
      router.push('/admin/condominios');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-bold">Novo Condomínio</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Informações Principais ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
            <span className="material-symbols-outlined text-primary">apartment</span>
            Informações Principais
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* CNPJ */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                CNPJ *
              </label>
              <div className="relative">
                <input
                  {...register('cnpj')}
                  onBlur={handleCNPJBlur}
                  placeholder="00.000.000/0000-00"
                  className="input w-full pr-9"
                />
                {cnpjLookingUp && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </span>
                )}
              </div>
              {errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj.message}</p>}
              <p className="mt-0.5 text-xs text-gray-400">
                Preencha para buscar dados automaticamente
              </p>
            </div>

            {/* Nome */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Condomínio *
              </label>
              <input {...register('nome')} className="input w-full" />
              {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
            </div>

            {/* Razão Social */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Razão Social
              </label>
              <input {...register('razao_social')} className="input w-full" />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Administrativo *
              </label>
              <input type="email" {...register('email_administrativo')} className="input w-full" />
              {errors.email_administrativo && (
                <p className="mt-1 text-xs text-red-600">{errors.email_administrativo.message}</p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefone
              </label>
              <input
                {...register('telefone')}
                placeholder="(00) 0000-0000"
                className="input w-full"
              />
            </div>

            {/* Cor Principal */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cor Principal
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  {...register('primary_color')}
                  defaultValue="#4F46E5"
                  className="h-9 w-16 cursor-pointer rounded border p-0.5"
                />
                <span className="text-xs text-gray-400">Cor de identidade visual</span>
              </div>
            </div>

            {/* Logo */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Logo
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="text-sm"
                />
                {logoUploading && <span className="text-xs text-gray-500">Enviando...</span>}
                {logoPreview && (
                  <img src={logoPreview} alt="Logo" className="h-10 w-auto rounded shadow" />
                )}
              </div>
              <input type="hidden" {...register('logo_url')} />
            </div>
          </div>
        </section>

        {/* ── Endereço ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
            <span className="material-symbols-outlined text-primary">location_on</span>
            Endereço e Localização
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* CEP */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                CEP *
              </label>
              <div className="relative">
                <input
                  {...register('cep')}
                  onBlur={handleCEPBlur}
                  placeholder="00000-000"
                  className="input w-full pr-9"
                />
                {cepLookingUp && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </span>
                )}
              </div>
              {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep.message}</p>}
            </div>

            {/* Logradouro */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Logradouro
              </label>
              <input {...register('logradouro')} className="input w-full" />
            </div>

            {/* Número */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Número
              </label>
              <input {...register('numero')} className="input w-full" />
            </div>

            {/* Complemento */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Complemento
              </label>
              <input {...register('complemento')} className="input w-full" />
            </div>

            {/* Bairro */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bairro
              </label>
              <input {...register('bairro')} className="input w-full" />
            </div>

            {/* Cidade */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cidade
              </label>
              <input {...register('cidade')} className="input w-full" />
            </div>

            {/* Estado */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Estado (UF)
              </label>
              <input
                {...register('estado')}
                maxLength={2}
                placeholder="SP"
                className="input w-full uppercase"
              />
            </div>
          </div>
        </section>

        {/* ── Configurações Operacionais ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
            <span className="material-symbols-outlined text-primary">settings</span>
            Configurações Operacionais
          </h2>

          {/* Dia de Vencimento */}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dia de Vencimento das Cotas
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={28}
                {...register('dia_vencimento', { valueAsNumber: true })}
                className="input w-24"
              />
              <span className="text-sm text-gray-500">de cada mês</span>
            </div>
          </div>

          {/* ── Blocos / Ruas ── */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Blocos / Ruas
                </p>
                <p className="text-xs text-gray-500">
                  Configure cada bloco ou rua e o número de unidades habitacionais
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {totalUnidades} unidades no total
              </div>
            </div>

            <div className="space-y-2">
              {blocoFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  {/* Índice */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </div>

                  {/* Nome do Bloco */}
                  <div className="flex-1">
                    <input
                      {...register(`blocos.${idx}.nome`)}
                      placeholder="Nome do Bloco/Rua (ex: Bloco A, Torre Norte, Rua das Flores)"
                      className="input w-full text-sm"
                    />
                    {errors.blocos?.[idx]?.nome && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {errors.blocos[idx]?.nome?.message}
                      </p>
                    )}
                  </div>

                  {/* Quantidade de Unidades */}
                  <div className="w-32 flex-shrink-0">
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        {...register(`blocos.${idx}.unidades`, { valueAsNumber: true })}
                        placeholder="0"
                        className="input w-full pr-2 text-center text-sm"
                      />
                    </div>
                    <p className="mt-0.5 text-center text-xs text-gray-400">unidades</p>
                    {errors.blocos?.[idx]?.unidades && (
                      <p className="text-xs text-red-600">
                        {errors.blocos[idx]?.unidades?.message}
                      </p>
                    )}
                  </div>

                  {/* Remover */}
                  <button
                    type="button"
                    onClick={() => removeBloco(idx)}
                    disabled={blocoFields.length === 1}
                    className="mt-1 flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-900/20"
                    title="Remover bloco"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addBloco({ nome: `Bloco ${blocoFields.length + 1}`, unidades: 10 })}
              className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/5 dark:border-primary/30"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Adicionar Bloco / Rua
            </button>
          </div>

          {/* ── Áreas Comuns ── */}
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Áreas Comuns de Lazer
            </p>
            <p className="mb-3 text-xs text-gray-500">
              Selecione as áreas disponíveis no condomínio
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AREAS_PRESET.map((area) => {
                const checked = selectedAreas.has(area);
                return (
                  <label
                    key={area}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-all ${
                      checked
                        ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                        : 'border-gray-200 text-gray-600 hover:border-primary/30 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleArea(area)}
                    />
                    {/* Custom checkbox */}
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        checked
                          ? 'border-primary bg-primary'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {checked && (
                        <svg
                          className="h-2.5 w-2.5 text-white"
                          fill="none"
                          viewBox="0 0 12 10"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1,5 4,8 11,1" />
                        </svg>
                      )}
                    </span>
                    <span className="leading-tight">{area}</span>
                  </label>
                );
              })}
            </div>

            {/* Áreas personalizadas */}
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-600">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                <span className="material-symbols-outlined mr-1 align-middle text-sm">
                  add_circle
                </span>
                Outras áreas não listadas acima (separadas por vírgula)
              </label>
              <input
                type="text"
                value={customArea}
                onChange={(e) => handleCustomAreaChange(e.target.value)}
                placeholder="Ex: Heliponto, Marina, Pista de Skate..."
                className="input w-full text-sm"
              />
            </div>

            {/* Hidden field stores the combined value */}
            <input type="hidden" {...register('areas_comuns_string')} />
          </div>
        </section>

        {/* ── Plano e Módulos ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
            <span className="material-symbols-outlined text-primary">extension</span>
            Plano e Módulos
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { name: 'modules.financeiro', label: 'Financeiro', icon: 'payments' },
                { name: 'modules.assembleias', label: 'Assembleias', icon: 'groups' },
                { name: 'modules.comunicacao', label: 'Comunicação', icon: 'forum' },
                { name: 'modules.norma_ai', label: 'Norma AI', icon: 'smart_toy' },
              ] as const
            ).map(({ name, label, icon }) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 hover:border-primary/40 dark:border-gray-700"
              >
                <input
                  type="checkbox"
                  defaultChecked
                  {...register(name)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="material-symbols-outlined text-base text-gray-400">{icon}</span>
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Ações ── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">save</span>
                Criar Condomínio
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
