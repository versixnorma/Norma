'use client';

import type { PautaComJoins } from '@versix/shared';
import { useState } from 'react';

interface VotacaoCardProps {
  pauta: PautaComJoins;
  onVotar: (voto: "sim" | "nao" | "abstencao" | "opcao", opcaoId?: string) => Promise<void>;
  jaVotou: boolean;
}

export function VotacaoCard({ pauta, onVotar, jaVotou }: VotacaoCardProps) {
  const [votoSelecionado, setVotoSelecionado] = useState<"sim" | "nao" | "abstencao" | null>(null);
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
      <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
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
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">schedule</span>
        <p className="text-gray-500">Aguardando abertura da votação</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card-dark rounded-2xl p-6 border-2 border-primary/30 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary animate-pulse">how_to_vote</span>
        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{pauta.titulo}</h3>
      </div>

      {pauta.descricao && <p className="text-gray-600 dark:text-gray-400 mb-6">{pauta.descricao}</p>}

      {pauta.voto_secreto && (
        <div className="mb-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <span className="material-symbols-outlined">lock</span>
          Voto secreto - sua escolha não será identificada
        </div>
      )}

      {pauta.tipo_votacao === 'aprovacao' ? (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => setVotoSelecionado('sim')} disabled={enviando}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${votoSelecionado === 'sim' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-green-300'}`}>
            <span className={`material-symbols-outlined text-3xl ${votoSelecionado === 'sim' ? 'text-green-500' : 'text-gray-400'}`}>thumb_up</span>
            <span className="font-medium">A Favor</span>
          </button>

          <button onClick={() => setVotoSelecionado('nao')} disabled={enviando}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${votoSelecionado === 'nao' ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-red-300'}`}>
            <span className={`material-symbols-outlined text-3xl ${votoSelecionado === 'nao' ? 'text-red-500' : 'text-gray-400'}`}>thumb_down</span>
            <span className="font-medium">Contra</span>
          </button>

          {pauta.permite_abstencao && (
            <button onClick={() => setVotoSelecionado('abstencao')} disabled={enviando}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${votoSelecionado === 'abstencao' ? 'border-gray-500 bg-gray-100 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}>
              <span className={`material-symbols-outlined text-3xl ${votoSelecionado === 'abstencao' ? 'text-gray-500' : 'text-gray-400'}`}>remove_circle_outline</span>
              <span className="font-medium">Abstenção</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {pauta.opcoes?.map(opcao => (
            <button key={opcao.id} onClick={() => setOpcaoSelecionada(opcao.id)} disabled={enviando}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${opcaoSelecionada === opcao.id ? 'border-primary bg-primary/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${opcaoSelecionada === opcao.id ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                {opcaoSelecionada === opcao.id && <span className="material-symbols-outlined text-white text-sm">check</span>}
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{opcao.titulo}</p>
                {opcao.descricao && <p className="text-sm text-gray-500">{opcao.descricao}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <button onClick={handleVotar} disabled={enviando || (!votoSelecionado && !opcaoSelecionada)}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {enviando ? (
          <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
        ) : (
          <><span className="material-symbols-outlined">send</span> Confirmar Voto</>
        )}
      </button>
    </div>
  );
}
