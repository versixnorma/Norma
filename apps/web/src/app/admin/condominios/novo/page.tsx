'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { condominioFormSchema, type CondominioFormInput } from '@/lib/schemas/condominioForm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function NovoCondominioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CondominioFormInput>({
    resolver: zodResolver(condominioFormSchema),
    defaultValues: {
      dia_vencimento: 10,
      quantidade_blocos: 2,
      unidades_por_bloco: 40,
      areas_comuns: ['Piscina', 'Salão de Festas', 'Academia', 'Churrasqueira'],
      modules: {
        financeiro: true,
        assembleias: true,
        comunicacao: true,
        norma_ai: true,
      },
    },
  });

  async function onSubmit(data: CondominioFormInput) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/condominios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao criar condomínio');
      toast.success('Condomínio criado com sucesso');
      router.push('/admin/condominios');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  // Autofill helpers (simple; calls external APIs could be integrated)
  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!r.ok) return;
      const json = await r.json();
      if (json.erro) return;
      setValue('logradouro', json.logradouro || '');
      setValue('bairro', json.bairro || '');
      setValue('cidade', json.localidade || '');
      setValue('estado', json.uf || '');
    } catch {
      // ignore
    }
  };

  const handleCNPJBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cnpj = e.target.value.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) return;
    // Placeholder: if there's an external registry lookup, call here.
    // For now, no-op.
  };

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-4 text-2xl font-bold">Novo Condomínio</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informações Principais */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Informações Principais</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm">CNPJ</label>
              <input {...register('cnpj')} onBlur={handleCNPJBlur} className="input mt-1 w-full" />
              {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
            </div>
            <div>
              <label className="text-sm">Nome do Condomínio</label>
              <input {...register('nome')} className="input mt-1 w-full" />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="text-sm">Razão Social</label>
              <input {...register('razao_social')} className="input mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm">Email Administrativo</label>
              <input {...register('email_administrativo')} className="input mt-1 w-full" />
              {errors.email_administrativo && (
                <p className="text-xs text-red-600">{errors.email_administrativo.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm">Telefone</label>
              <input {...register('telefone')} className="input mt-1 w-full" />
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Endereço e Localização</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm">CEP</label>
              <input {...register('cep')} onBlur={handleCEPBlur} className="input mt-1 w-full" />
              {errors.cep && <p className="text-xs text-red-600">{errors.cep.message}</p>}
            </div>
            <div>
              <label className="text-sm">Logradouro</label>
              <input {...register('logradouro')} className="input mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm">Número</label>
              <input {...register('numero')} className="input mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm">Complemento</label>
              <input {...register('complemento')} className="input mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm">Bairro</label>
              <input {...register('bairro')} className="input mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm">Cidade</label>
              <input {...register('cidade')} className="input mt-1 w-full" />
            </div>
            <div>
              <label className="text-sm">Estado (UF)</label>
              <input {...register('estado')} className="input mt-1 w-full" />
            </div>
          </div>
        </section>

        {/* Configurações Operacionais */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Configurações Operacionais</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm">Dia de Vencimento</label>
              <input
                type="number"
                min={1}
                max={28}
                {...register('dia_vencimento', { valueAsNumber: true })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm">Quantidade de Blocos/Ruas</label>
              <input
                type="number"
                {...register('quantidade_blocos', { valueAsNumber: true })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm">Unidades por Bloco</label>
              <input
                type="number"
                {...register('unidades_por_bloco', { valueAsNumber: true })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm">Áreas Comuns (comma separated)</label>
              <input
                {...register('areas_comuns_string')}
                className="input mt-1 w-full"
                placeholder="Piscina, Salão de Festas, Academia"
              />
            </div>
          </div>
        </section>

        {/* Plano e Módulos */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Plano e Módulos</h2>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked {...register('modules.financeiro')} />{' '}
              Financeiro
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked {...register('modules.assembleias')} />{' '}
              Assembleias
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked {...register('modules.comunicacao')} />{' '}
              Comunicação
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked {...register('modules.norma_ai')} /> Norma AI
            </label>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2 text-white"
          >
            {loading ? 'Salvando...' : 'Criar Condomínio'}
          </button>
        </div>
      </form>
    </div>
  );
}
