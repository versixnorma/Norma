'use client';

import type { PautaComJoins } from '@versix/shared';
import { useState } from 'react';

interface VotacaoCardProps {
  pauta: PautaComJoins;
  onVotar: (voto: 'sim' | 'nao' | 'abstencao' | 'opcao', opcaoId?: string) => Promise<void>;
  jaVotou: boolean;
}

export function VotacaoCard({ pauta, onVotar, jaVotou }: VotacaoCardProps) {
  const [votoSelecionado, setVotoSelecionado] = useState<'sim' | 'nao' | 'abstencao' | null>(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleVotar = async () => {
    if (!votoSelecionado && !opcaoSelecionada) return;
    setEnviando(true);
    try {
      await onVotar(opcaoSelecionada ? 'opcao' : votoSelecionado!, opcaoSelecionada || undefined);
    } finally {
      setEnviando(false);
    }
  };

  if (jaVotou) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-700 dark:bg-green-900/20">
        <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
          <div>
            <p className="font-semibold">Voto registrado!</p>
            <p className="text-sm opacity-80">Seu voto foi contabilizado com sucesso.</p>
          </div>
        </div>
      </div>
    );
  }

  if (pauta.status !== 'em_votacao') {
    return (
      <div className="rounded-2xl bg-gray-50 p-6 text-center dark:bg-gray-800">
        <span className="material-symbols-outlined mb-2 text-4xl text-gray-400">schedule</span>
        <p className="text-gray-500">Aguardando abertura da votação</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-white p-6 shadow-lg dark:bg-card-dark">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined animate-pulse text-primary">how_to_vote</span>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{pauta.titulo}</h3>
      </div>

      {pauta.descricao && (
        <p className="mb-6 text-gray-600 dark:text-gray-400">{pauta.descricao}</p>
      )}

      {pauta.voto_secreto && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <span className="material-symbols-outlined">lock</span>
          Voto secreto - sua escolha não será identificada
        </div>
      )}

      {pauta.tipo_votacao === 'aprovacao' ? (
        <div className="mb-6 grid grid-cols-3 gap-3" role="group" aria-label="Opções de voto">
          <button
            onClick={() => setVotoSelecionado('sim')}
            disabled={enviando}
            aria-pressed={votoSelecionado === 'sim'}
            aria-label="Votar A Favor"
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 outline-none transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 ${votoSelecionado === 'sim' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 hover:border-green-300 dark:border-gray-700'}`}
          >
            <span
              className={`material-symbols-outlined text-3xl ${votoSelecionado === 'sim' ? 'text-green-500' : 'text-gray-400'}`}
              aria-hidden="true"
            >
              thumb_up
            </span>
            <span className="font-medium">A Favor</span>
          </button>

          <button
            onClick={() => setVotoSelecionado('nao')}
            disabled={enviando}
            aria-pressed={votoSelecionado === 'nao'}
            aria-label="Votar Contra"
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 outline-none transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 ${votoSelecionado === 'nao' ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 hover:border-red-300 dark:border-gray-700'}`}
          >
            <span
              className={`material-symbols-outlined text-3xl ${votoSelecionado === 'nao' ? 'text-red-500' : 'text-gray-400'}`}
              aria-hidden="true"
            >
              thumb_down
            </span>
            <span className="font-medium">Contra</span>
          </button>

          {pauta.permite_abstencao && (
            <button
              onClick={() => setVotoSelecionado('abstencao')}
              disabled={enviando}
              aria-pressed={votoSelecionado === 'abstencao'}
              aria-label="Abster-se do voto"
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 outline-none transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 ${votoSelecionado === 'abstencao' ? 'border-gray-500 bg-gray-100 dark:bg-gray-700' : 'border-gray-200 hover:border-gray-400 dark:border-gray-700'}`}
            >
              <span
                className={`material-symbols-outlined text-3xl ${votoSelecionado === 'abstencao' ? 'text-gray-500' : 'text-gray-400'}`}
                aria-hidden="true"
              >
                remove_circle_outline
              </span>
              <span className="font-medium">Abstenção</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mb-6 space-y-2" role="radiogroup" aria-label="Opções da pauta">
          {pauta.opcoes?.map((opcao) => (
            <button
              key={opcao.id}
              onClick={() => setOpcaoSelecionada(opcao.id)}
              disabled={enviando}
              role="radio"
              aria-checked={opcaoSelecionada === opcao.id}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left outline-none transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 ${opcaoSelecionada === opcao.id ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary/50 dark:border-gray-700'}`}
            >
              <div
                aria-hidden="true"
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${opcaoSelecionada === opcao.id ? 'border-primary bg-primary' : 'border-gray-300'}`}
              >
                {opcaoSelecionada === opcao.id && (
                  <span className="material-symbols-outlined text-sm text-white">check</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">{opcao.titulo}</p>
                {opcao.descricao && <p className="text-sm text-gray-500">{opcao.descricao}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleVotar}
        disabled={enviando || (!votoSelecionado && !opcaoSelecionada)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />{' '}
            Enviando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">send</span> Confirmar Voto
          </>
        )}
      </button>
    </div>
  );
}
