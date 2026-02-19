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
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Novo Condomínio</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informações Principais */}
        <section className="p-4 border rounded-lg">
          <h2 className="font-semibold mb-3">Informações Principais</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm">CNPJ</label>
              <input {...register('cnpj')} onBlur={handleCNPJBlur} className="w-full mt-1 input" />
              {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
            </div>
            <div>
              <label className="text-sm">Nome do Condomínio</label>
              <input {...register('nome')} className="w-full mt-1 input" />
              {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="text-sm">Razão Social</label>
              <input {...register('razao_social')} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Email Administrativo</label>
              <input {...register('email_administrativo')} className="w-full mt-1 input" />
              {errors.email_administrativo && <p className="text-xs text-red-600">{errors.email_administrativo.message}</p>}
            </div>
            <div>
              <label className="text-sm">Telefone</label>
              <input {...register('telefone')} className="w-full mt-1 input" />
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section className="p-4 border rounded-lg">
          <h2 className="font-semibold mb-3">Endereço e Localização</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm">CEP</label>
              <input {...register('cep')} onBlur={handleCEPBlur} className="w-full mt-1 input" />
              {errors.cep && <p className="text-xs text-red-600">{errors.cep.message}</p>}
            </div>
            <div>
              <label className="text-sm">Logradouro</label>
              <input {...register('logradouro')} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Número</label>
              <input {...register('numero')} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Complemento</label>
              <input {...register('complemento')} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Bairro</label>
              <input {...register('bairro')} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Cidade</label>
              <input {...register('cidade')} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Estado (UF)</label>
              <input {...register('estado')} className="w-full mt-1 input" />
            </div>
          </div>
        </section>

        {/* Configurações Operacionais */}
        <section className="p-4 border rounded-lg">
          <h2 className="font-semibold mb-3">Configurações Operacionais</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm">Dia de Vencimento</label>
              <input type="number" min={1} max={28} {...register('dia_vencimento', { valueAsNumber: true })} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Quantidade de Blocos/Ruas</label>
              <input type="number" {...register('quantidade_blocos', { valueAsNumber: true })} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Unidades por Bloco</label>
              <input type="number" {...register('unidades_por_bloco', { valueAsNumber: true })} className="w-full mt-1 input" />
            </div>
            <div>
              <label className="text-sm">Áreas Comuns (comma separated)</label>
              <input {...register('areas_comuns_string')} className="w-full mt-1 input" placeholder="Piscina, Salão de Festas, Academia" />
            </div>
          </div>
        </section>

        {/* Plano e Módulos */}
        <section className="p-4 border rounded-lg">
          <h2 className="font-semibold mb-3">Plano e Módulos</h2>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked {...register('modules.financeiro')} /> Financeiro</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked {...register('modules.assembleias')} /> Assembleias</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked {...register('modules.comunicacao')} /> Comunicação</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked {...register('modules.norma_ai')} /> Norma AI</label>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border">Cancelar</button>
          <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-white">{loading ? 'Salvando...' : 'Criar Condomínio'}</button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { CondominioForm } from '@/components/admin/condominios/CondominioForm';
import { AuthGuard } from '@/contexts/AuthContext';

export default function NovoCondominioPage() {
  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Novo Condomínio</h1>
          <p className="text-sm text-gray-500">Cadastre um novo condomínio no sistema</p>
        </div>

        <CondominioForm mode="create" />
      </div>
    </AuthGuard>
  );
}
