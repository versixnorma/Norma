'use client';

import type { AdminCondominio } from '@/hooks/useAdmin';
import { useVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import { useRef } from 'react';

interface CondominiosListProps {
  condominios: AdminCondominio[];
  loading?: boolean;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-700',
  pendente: 'bg-yellow-100 text-yellow-700',
  suspenso: 'bg-red-100 text-red-700',
};

export function CondominiosList({ condominios, loading }: CondominiosListProps) {
  const handleAction = async (id: string, action: 'inactivate' | 'activate' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm('Confirmar exclusão do condomínio? Esta ação é irreversível.')) return;
        const res = await fetch(`/api/admin/condominios/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao deletar condomínio');
        // refresh page data if provided
        window.location.reload();
        return;
      }

      const confirmMsg = action === 'inactivate' ? 'Inativar condomínio?' : 'Ativar condomínio?';
      if (!confirm(confirmMsg)) return;
      const res = await fetch(`/api/admin/condominios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar status');
      // reload or refresh
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Erro');
    }
  };
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: condominios.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 170,
    overscan: 8,
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white p-6 dark:bg-card-dark">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="mb-2 h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (condominios.length === 0) {
    return (
      <div className="rounded-2xl bg-white py-12 text-center dark:bg-card-dark">
        <span className="material-symbols-outlined mb-3 text-5xl text-gray-400">apartment</span>
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">
          Nenhum condomínio cadastrado
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Crie o primeiro condomínio para começar
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-[620px] overflow-auto rounded-2xl">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const condo = condominios[virtualRow.index];
          return (
            <div
              key={condo.id}
              className="absolute left-0 top-0 w-full pb-4"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-card-dark">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <span className="material-symbols-outlined text-3xl text-primary">
                        apartment
                      </span>
                    </div>
                    <div>
                      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">
                        {condo.nome}
                      </h3>
                      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                        {condo.endereco}
                      </p>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="material-symbols-outlined text-lg text-gray-400">
                            group
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">
                            {condo.total_usuarios} usuários
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="material-symbols-outlined text-lg text-gray-400">
                            home
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">
                            {condo.total_unidades} unidades
                          </span>
                        </div>
                        {condo.sindico_nome && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-lg text-gray-400">
                              badge
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">
                              Síndico: {condo.sindico_nome}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[condo.status] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {condo.status.charAt(0).toUpperCase() + condo.status.slice(1)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/condominios/${condo.id}`}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Ver detalhes"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </Link>
                      <Link
                        href={`/admin/condominios/${condo.id}/edit`}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </Link>
                      <Link
                        href={`/admin/usuarios?condominio=${condo.id}`}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Ver usuários"
                      >
                        <span className="material-symbols-outlined">group</span>
                      </Link>
                      <button
                        onClick={() =>
                          handleAction(
                            condo.id,
                            condo.status === 'ativo' ? 'inactivate' : 'activate'
                          )
                        }
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
                        title={condo.status === 'ativo' ? 'Inativar' : 'Ativar'}
                      >
                        <span className="material-symbols-outlined">
                          {condo.status === 'ativo' ? 'block' : 'check_circle'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleAction(condo.id, 'delete')}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                        title="Deletar"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
