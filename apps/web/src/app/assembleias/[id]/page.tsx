'use client';

import { QuorumIndicator } from '@/components/assembleias/QuorumIndicator';
import { ResultadoVotacao } from '@/components/assembleias/ResultadoVotacao';
import { VotacaoCard } from '@/components/assembleias/VotacaoCard';
import { AuthGuard } from '@/contexts/AuthContext';
import { useAssembleias } from '@/hooks/useAssembleias';
import { useVotacao } from '@/hooks/useVotacao';
import type { AssembleiaComJoins, Presenca, QuorumInfo } from '@versix/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function AssembleiaDetalhePage() {
  const params = useParams();
  const id = params?.id as string;
  const { getAssembleia, subscribeToQuorum } = useAssembleias();
  const { registrarPresenca, getMinhaPresenca, votar, jaVotou } = useVotacao();

  const [assembleia, setAssembleia] = useState<AssembleiaComJoins | null>(null);
  const [minhaPresenca, setMinhaPresenca] = useState<Presenca | null>(null);
  const [quorum, setQuorum] = useState<QuorumInfo | null>(null);
  const [votosRegistrados, setVotosRegistrados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getAssembleia(id as string);
    if (data) {
      setAssembleia(data);
      setQuorum(data.quorum || null);
    }
    const presenca = await getMinhaPresenca(id as string);
    setMinhaPresenca(presenca);

    // Verificar votos já registrados
    if (presenca && data?.pautas) {
      const votados = new Set<string>();
      for (const pauta of data.pautas) {
        if (await jaVotou(pauta.id, presenca.id)) {
          votados.add(pauta.id);
        }
      }
      setVotosRegistrados(votados);
    }
    setLoading(false);
  }, [id, getAssembleia, getMinhaPresenca, jaVotou]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => { void loadData(); });
    return () => cancelAnimationFrame(handle);
  }, [loadData]);

  // Subscribe to quorum updates
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToQuorum(id as string, (newQuorum) => {
      setQuorum(newQuorum);
    });
    return unsubscribe;
  }, [id, subscribeToQuorum]);

  const handleRegistrarPresenca = async () => {
    if (!id) return;
    setRegistrando(true);
    const presencaId = await registrarPresenca(id as string, 'online');
    if (presencaId) {
      toast.success('Presença registrada com sucesso!');
      loadData();
    } else {
      toast.error('Erro ao registrar presença');
    }
    setRegistrando(false);
  };

  const handleVotar = async (pautaId: string, voto: 'sim' | 'nao' | 'abstencao' | 'opcao', opcaoId?: string) => {
    if (!minhaPresenca) return;
    const votoId = await votar({ pauta_id: pautaId, presenca_id: minhaPresenca.id, voto, opcao_id: opcaoId });
    if (votoId) {
      toast.success('Voto registrado com sucesso!');
      setVotosRegistrados(prev => new Set([...prev, pautaId]));
    } else {
      toast.error('Erro ao registrar voto');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthGuard>
    );
  }

  if (!assembleia) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">error</span>
            <p className="text-gray-500">Assembleia não encontrada</p>
            <Link href="/assembleias" className="text-primary mt-2 inline-block">Voltar</Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const isAtiva = ['em_andamento', 'votacao'].includes(assembleia.status);
  const pautaAtual = assembleia.pautas?.find(p => p.status === 'em_votacao');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Link href="/assembleias" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${assembleia.tipo === 'AGO' ? 'bg-primary text-white' : 'bg-amber-500 text-white'}`}>
                    {assembleia.tipo}
                  </span>
                  {isAtiva && <span className="flex items-center gap-1 text-xs text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Ao vivo</span>}
                </div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-1">{assembleia.titulo}</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Quorum */}
          {quorum && <QuorumIndicator quorum={quorum} quorumMinimo={assembleia.quorum_minimo_primeira} />}

          {/* Registrar presença */}
          {isAtiva && !minhaPresenca && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-700">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">person_add</span>
                Registre sua presença
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">Para participar e votar, você precisa registrar sua presença.</p>
              <button onClick={handleRegistrarPresenca} disabled={registrando}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {registrando ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined">check_circle</span>}
                {registrando ? 'Registrando...' : 'Confirmar Presença'}
              </button>
            </div>
          )}

          {/* Presença confirmada */}
          {minhaPresenca && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-700 flex items-center gap-3">
              <span className="material-symbols-outlined text-green-600 text-2xl">verified</span>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Presença confirmada</p>
                <p className="text-sm text-green-600 dark:text-green-400">Você está participando desta assembleia</p>
              </div>
            </div>
          )}

          {/* Pauta em votação */}
          {pautaAtual && minhaPresenca && (
            <VotacaoCard
              pauta={pautaAtual}
              onVotar={(voto, opcaoId) => handleVotar(pautaAtual.id, voto, opcaoId)}
              jaVotou={votosRegistrados.has(pautaAtual.id)}
            />
          )}

          {/* Lista de pautas */}
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined">list</span>
                Pauta ({assembleia.pautas?.length || 0} itens)
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {assembleia.pautas?.sort((a, b) => a.ordem - b.ordem).map(pauta => (
                <div key={pauta.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      pauta.status === 'em_votacao' ? 'bg-amber-100 text-amber-700' :
                      pauta.status === 'aprovada' ? 'bg-green-100 text-green-700' :
                      pauta.status === 'rejeitada' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {pauta.ordem}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-white">{pauta.titulo}</p>
                      {pauta.descricao && <p className="text-sm text-gray-500 mt-1">{pauta.descricao}</p>}

                      {/* Status badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {pauta.voto_secreto && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-xs">lock</span>Secreto</span>}
                        {pauta.quorum_especial !== 'maioria_simples' && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{pauta.quorum_especial?.replace('_', ' ')}</span>}
                        {votosRegistrados.has(pauta.id) && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-xs">check</span>Votou</span>}
                      </div>

                      {/* Resultado */}
                      {['aprovada', 'rejeitada', 'encerrada'].includes(pauta.status) && pauta.resultado && (
                        <div className="mt-3">
                          <ResultadoVotacao pauta={pauta} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Informações */}
          <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              Informações
            </h3>
            <div className="space-y-3 text-sm">
              {assembleia.data_primeira_convocacao && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400">calendar_today</span>
                  <div>
                    <p className="text-gray-500">Data</p>
                    <p className="text-gray-800 dark:text-white">{formatDate(assembleia.data_primeira_convocacao)}</p>
                  </div>
                </div>
              )}
              {assembleia.local_presencial && (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400">location_on</span>
                  <div>
                    <p className="text-gray-500">Local</p>
                    <p className="text-gray-800 dark:text-white">{assembleia.local_presencial}</p>
                  </div>
                </div>
              )}
              {assembleia.link_video && isAtiva && (
                <a href={assembleia.link_video} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                  <span className="material-symbols-outlined">videocam</span>
                  <span className="font-medium">Entrar na videoconferência</span>
                  <span className="material-symbols-outlined ml-auto">open_in_new</span>
                </a>
              )}
            </div>
          </div>

          {/* Ata */}
          {assembleia.ata_pdf_path && (
            <a href={assembleia.ata_pdf_path} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
              <span className="material-symbols-outlined text-3xl text-red-500">picture_as_pdf</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-white">Ata da Assembleia</p>
                <p className="text-sm text-gray-500">Clique para visualizar o documento</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">download</span>
            </a>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
