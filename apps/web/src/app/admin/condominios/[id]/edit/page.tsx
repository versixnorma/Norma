'use client';

import { CondominioForm } from '@/components/admin/condominios/CondominioForm';
import { AuthGuard } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditarCondominioPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [initialValues, setInitialValues] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase.from('condominios').select('*').eq('id', id).single();
      if (data) {
        setInitialValues({
          nome: data.nome,
          cnpj: data.cnpj || '',
          endereco: data.endereco,
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep,
          tier: data.tier,
          total_unidades: String(data.total_unidades || ''),
          telefone: data.telefone || '',
          email: data.email || '',
          logo_url: data.logo_url || '',
          cor_primaria: data.cor_primaria || '#3B82F6',
          ativo: data.ativo ?? true,
        });
      }
      setLoading(false);
    };
    load();
  }, [id, supabase]);

  if (loading) {
    return (
      <AuthGuard requiredRoles={['superadmin']}>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  if (!initialValues) {
    return (
      <AuthGuard requiredRoles={['superadmin']}>
        <div className="text-sm text-gray-500">Condomínio não encontrado.</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Editar Condomínio</h1>
          <p className="text-sm text-gray-500">Atualize as informações do condomínio</p>
        </div>

        <CondominioForm mode="edit" condominioId={id} initialValues={initialValues} />
      </div>
    </AuthGuard>
  );
}
