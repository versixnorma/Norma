'use client';

import { ComunicadoCard } from '@/components/comunicados/ComunicadoCard';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useComunicados } from '@/hooks/useComunicados';
import type { ComunicadoCategoria } from '@versix/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const CATEGORIAS = [
  { value: '', label: 'Todas' }, { value: 'geral', label: 'Geral' }, { value: 'urgente', label: 'Urgente' },
  { value: 'manutencao', label: 'Manutenção' }, { value: 'financeiro', label: 'Financeiro' },
  { value: 'assembleia', label: 'Assembleia' }, { value: 'seguranca', label: 'Segurança' }, { value: 'evento', label: 'Evento' },
  { value: 'obras', label: 'Obras' }
];

export default function ComunicadosPage() {
  const { profile } = useAuthContext();
  const { comunicados, loading, fetchComunicados, marcarComoLido } = useComunicados();
  const [categoria, setCategoria] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) fetchComunicados(condominioId, { status: 'publicado', categoria: categoria as ComunicadoCategoria || undefined });
  }, [condominioId, categoria, fetchComunicados]);

  const handleCardClick = async (id: string) => {
    setSelectedId(id);
    if (profile?.id) await marcarComoLido(id);
  };

  const selectedComunicado = comunicados.find(c => c.id === selectedId);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Comunicados</h1>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {CATEGORIAS.map(cat => (
                <button key={cat.value} onClick={() => setCategoria(cat.value)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${categoria === cat.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{cat.label}</button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : comunicados.length === 0 ? (
            <div className="text-center py-12"><span className="material-symbols-outlined text-5xl text-gray-400 mb-3">campaign</span><h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Nenhum comunicado</h3><p className="text-gray-500">Não há comunicados publicados no momento</p></div>
          ) : (
            <div className="space-y-4">
              {comunicados.filter(c => c.fixado).map(c => <ComunicadoCard key={c.id} comunicado={c} onClick={() => handleCardClick(c.id)} />)}
              {comunicados.filter(c => !c.fixado).map(c => <ComunicadoCard key={c.id} comunicado={c} onClick={() => handleCardClick(c.id)} />)}
            </div>
          )}
        </main>

        {selectedComunicado && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setSelectedId(null)}>
            <div className="bg-white dark:bg-card-dark w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-1">{selectedComunicado.titulo}</h2>
                <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-lg">calendar_today</span>{new Date(selectedComunicado.published_at || selectedComunicado.created_at).toLocaleDateString('pt-BR')}</span>
                  {selectedComunicado.autor && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-lg">person</span>{selectedComunicado.autor.nome}</span>}
                </div>
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{selectedComunicado.conteudo}</div>
                {Array.isArray(selectedComunicado.anexos) && selectedComunicado.anexos.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-3">Anexos</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedComunicado.anexos.map((anexo: any, i: number) => (
                        <a key={i} href={anexo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          <span className="material-symbols-outlined text-primary">{anexo.tipo.includes('pdf') ? 'picture_as_pdf' : 'image'}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{anexo.nome}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
