'use client';

import type { AdminCondominio } from '@/hooks/useAdmin';
import Link from 'next/link';

interface CondominiosListProps {
  condominios: AdminCondominio[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = { ativo: 'bg-green-100 text-green-700', inativo: 'bg-gray-100 text-gray-700', pendente: 'bg-yellow-100 text-yellow-700', suspenso: 'bg-red-100 text-red-700' };

export function CondominiosList({ condominios, loading }: CondominiosListProps) {
  if (loading) {
    return (<div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="bg-white dark:bg-card-dark rounded-2xl p-6 animate-pulse"><div className="flex items-start gap-4"><div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" /><div className="flex-1"><div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" /><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" /></div></div></div>))}</div>);
  }

  if (condominios.length === 0) {
    return (<div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl"><span className="material-symbols-outlined text-5xl text-gray-400 mb-3">apartment</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhum condomínio cadastrado</h3><p className="text-gray-500 dark:text-gray-400 text-sm">Crie o primeiro condomínio para começar</p></div>);
  }

  return (
    <div className="space-y-4">
      {condominios.map((condo) => (
        <div key={condo.id} className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-primary text-3xl">apartment</span></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{condo.nome}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{condo.endereco}</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-gray-400 text-lg">group</span><span className="text-gray-600 dark:text-gray-300">{condo.total_usuarios} usuários</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-gray-400 text-lg">home</span><span className="text-gray-600 dark:text-gray-300">{condo.total_unidades} unidades</span></div>
                  {condo.sindico_nome && (<div className="flex items-center gap-2 text-sm"><span className="material-symbols-outlined text-gray-400 text-lg">badge</span><span className="text-gray-600 dark:text-gray-300">Síndico: {condo.sindico_nome}</span></div>)}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[condo.status] || 'bg-gray-100 text-gray-700'}`}>{condo.status.charAt(0).toUpperCase() + condo.status.slice(1)}</span>
              <div className="flex items-center gap-2">
                <Link href={`/admin/condominios/${condo.id}`} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Ver detalhes"><span className="material-symbols-outlined">visibility</span></Link>
                <Link href={`/admin/condominios/${condo.id}/edit`} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar"><span className="material-symbols-outlined">edit</span></Link>
                <Link href={`/admin/usuarios?condominio=${condo.id}`} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Ver usuários"><span className="material-symbols-outlined">group</span></Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
