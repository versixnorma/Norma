'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { AuthGuard } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CondominioDetails {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  tier: string;
  total_unidades: number;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  ativo: boolean;
  created_at: string;
}

export default function CondominioDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [condominio, setCondominio] = useState<CondominioDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase.from('condominios').select('*').eq('id', id).single();
      setCondominio((data as CondominioDetails) || null);
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

  if (!condominio) {
    return (
      <AuthGuard requiredRoles={['superadmin']}>
        <div className="text-sm text-gray-500">Condomínio não encontrado.</div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{condominio.nome}</h1>
            <p className="text-sm text-gray-500">Detalhes do condomínio</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/condominios/${condominio.id}/edit`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              Editar
            </Link>
            <Link
              href="/admin/condominios"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Voltar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Informações</h2>
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong>Tier:</strong> {condominio.tier}
              </p>
              <p>
                <strong>Total de unidades:</strong> {condominio.total_unidades}
              </p>
              <p>
                <strong>Status:</strong> {condominio.ativo ? 'Ativo' : 'Inativo'}
              </p>
              <p>
                <strong>CNPJ:</strong> {condominio.cnpj || '—'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Contato</h2>
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong>Email:</strong> {condominio.email || '—'}
              </p>
              <p>
                <strong>Telefone:</strong> {condominio.telefone || '—'}
              </p>
              <p>
                <strong>Cor primária:</strong> {condominio.cor_primaria || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Endereço</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {condominio.endereco}
            {condominio.numero ? `, ${condominio.numero}` : ''}
            {condominio.complemento ? ` - ${condominio.complemento}` : ''}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {condominio.bairro} - {condominio.cidade}/{condominio.estado} - {condominio.cep}
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
