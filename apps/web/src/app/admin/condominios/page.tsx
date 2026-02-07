'use client';

import { CondominiosList } from '@/components/admin/CondominiosList';
import { AuthGuard } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function AdminCondominiosPage() {
  const { condominios, loading, fetchCondominios } = useAdmin();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCondominios();
  }, [fetchCondominios]);

  const filtered = useMemo(() => {
    if (!search) return condominios;
    const needle = search.toLowerCase();
    return condominios.filter((c) => c.nome.toLowerCase().includes(needle));
  }, [condominios, search]);

  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Condomínios</h1>
            <p className="text-sm text-gray-500">Gestão completa de condomínios</p>
          </div>
          <Link
            href="/admin/condominios/novo"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Condomínio
          </Link>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar condomínio..."
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
        />

        <CondominiosList condominios={filtered} loading={loading} />
      </div>
    </AuthGuard>
  );
}
