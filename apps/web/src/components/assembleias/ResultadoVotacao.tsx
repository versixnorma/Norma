'use client';

import type { PautaComJoins, ResultadoPauta } from '@versix/shared';

interface ResultadoVotacaoProps {
  pauta: PautaComJoins;
  resultado?: ResultadoPauta | null;
}

export function ResultadoVotacao({ pauta, resultado }: ResultadoVotacaoProps) {
  const res = resultado || pauta.resultado;
  if (!res) return null;

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-700 border-green-300', icon: 'check_circle' },
    rejeitada: { label: 'Rejeitada', color: 'bg-red-100 text-red-700 border-red-300', icon: 'cancel' },
    encerrada: { label: 'Encerrada', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: 'task_alt' },
    sem_quorum: { label: 'Sem Quórum', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: 'error' }
  };

  const status = STATUS_CONFIG[pauta.status] || STATUS_CONFIG.encerrada;

  if (pauta.tipo_votacao === 'aprovacao') {
    const totalVotos = (res.votos_sim || 0) + (res.votos_nao || 0);
    const percentSim = totalVotos > 0 ? ((res.votos_sim || 0) / totalVotos) * 100 : 0;
    const percentNao = totalVotos > 0 ? ((res.votos_nao || 0) / totalVotos) * 100 : 0;

    return (
      <div className={`rounded-2xl p-5 border-2 ${status.color}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined">{status.icon}</span>
            {status.label}
          </h3>
          <span className="text-sm opacity-75">{res.percentual_aprovacao?.toFixed(1)}% aprovação</span>
        </div>

        {/* Barra visual */}
        <div className="flex h-8 rounded-lg overflow-hidden mb-4">
          <div className="bg-green-500 flex items-center justify-center text-white text-sm font-bold transition-all" style={{ width: `${percentSim}%` }}>
            {percentSim > 10 && `${res.votos_sim}`}
          </div>
          <div className="bg-red-500 flex items-center justify-center text-white text-sm font-bold transition-all" style={{ width: `${percentNao}%` }}>
            {percentNao > 10 && `${res.votos_nao}`}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-600">{res.votos_sim || 0}</p>
            <p className="text-xs opacity-75">A favor</p>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-600">{res.votos_nao || 0}</p>
            <p className="text-xs opacity-75">Contra</p>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-500">{res.votos_abstencao || 0}</p>
            <p className="text-xs opacity-75">Abstenções</p>
          </div>
        </div>
      </div>
    );
  }

  // Eleição / Escolha
  if (res.eleitos && res.eleitos.length > 0) {
    return (
      <div className={`rounded-2xl p-5 border-2 ${status.color}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined">{status.icon}</span>
          <h3 className="font-semibold">{pauta.tipo_votacao === 'eleicao' ? 'Eleito(s)' : 'Resultado'}</h3>
        </div>

        <div className="space-y-3">
          {res.eleitos.map((eleito: { opcao_id: string; titulo: string; votos: number; fracoes?: number }, index: number) => (
            <div key={eleito.opcao_id} className="flex items-center gap-3 bg-white/50 dark:bg-black/20 rounded-xl p-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-400 text-white' : 'bg-gray-300 text-gray-700'}`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">{eleito.titulo}</p>
                <p className="text-sm opacity-75">{eleito.votos} votos ({eleito.fracoes?.toFixed(4)} frações)</p>
              </div>
              {index === 0 && <span className="material-symbols-outlined text-amber-500">emoji_events</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
