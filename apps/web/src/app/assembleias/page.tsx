'use client';

import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useAssembleias } from '@/hooks/useAssembleias';
import { AssembleiaCard } from '@/components/assembleias/AssembleiaCard';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AssembleiasPage() {
  const { profile } = useAuthContext();
  const { assembleias, loading, fetchAssembleias } = useAssembleias();
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) fetchAssembleias(condominioId);
  }, [condominioId, fetchAssembleias]);

  const assembleiasFiltradas = assembleias.filter(a => {
    if (filtroStatus === 'todas') return true;
    if (filtroStatus === 'ativas') return ['convocada', 'em_andamento', 'votacao'].includes(a.status);
    if (filtroStatus === 'encerradas') return ['encerrada', 'arquivada'].includes(a.status);
    return true;
  });

  const assembleiaAtiva = assembleias.find(a => ['em_andamento', 'votacao'].includes(a.status));

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Assembleias</h1>
                <p className="text-sm text-gray-500">{profile?.condominio_atual?.nome}</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {['todas', 'ativas', 'encerradas'].map(f => (
                <button key={f} onClick={() => setFiltroStatus(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filtroStatus === f ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                  {f === 'todas' ? 'Todas' : f === 'ativas' ? 'Ativas' : 'Encerradas'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {/* Banner de assembleia ao vivo */}
          {assembleiaAtiva && (
            <Link href={`/assembleias/${assembleiaAtiva.id}`}
              className="block mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="font-bold">ASSEMBLEIA AO VIVO</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">{assembleiaAtiva.titulo}</h3>
              <p className="text-sm opacity-90 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">groups</span>
                {assembleiaAtiva.quorum_atingido?.toFixed(1)}% de quórum
                <span className="material-symbols-outlined text-sm ml-2">arrow_forward</span>
                Participar agora
              </p>
            </Link>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assembleiasFiltradas.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">how_to_vote</span>
              <h3 className="text-lg font-semibold mb-1">Nenhuma assembleia encontrada</h3>
              <p className="text-gray-500">As assembleias do condomínio aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assembleiasFiltradas.map(a => (
                <AssembleiaCard key={a.id} assembleia={a} />
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
