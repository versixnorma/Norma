'use client';

import type { QuorumInfo } from '@versix/shared/types/assembleias';

interface QuorumIndicatorProps {
  quorum: QuorumInfo;
  quorumMinimo?: number;
  compact?: boolean;
}

export function QuorumIndicator({ quorum, quorumMinimo = 50, compact }: QuorumIndicatorProps) {
  const percentual = quorum.quorum_percentual || 0;
  const atingido = percentual >= quorumMinimo;
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${atingido ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
        </div>
        <span className={`text-sm font-bold ${atingido ? 'text-green-600' : 'text-amber-600'}`}>{percentual.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-card-dark rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined">groups</span>
          Quórum
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${atingido ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {atingido ? 'Atingido' : 'Aguardando'}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="relative mb-4">
        <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${atingido ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(percentual, 100)}%` }} />
        </div>
        {/* Marcador de quórum mínimo */}
        <div className="absolute top-0 h-full flex items-center" style={{ left: `${quorumMinimo}%` }}>
          <div className="w-0.5 h-6 bg-gray-400 -mt-1" />
        </div>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className={`text-3xl font-bold ${atingido ? 'text-green-600' : 'text-amber-600'}`}>{percentual.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Fração ideal representada</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-800 dark:text-white">{quorum.unidades_presentes}/{quorum.total_unidades}</p>
          <p className="text-xs text-gray-500">Unidades presentes</p>
        </div>
      </div>

      {/* Breakdown por tipo */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <p className="text-lg font-bold text-blue-600">{quorum.online || 0}</p>
          <p className="text-xs text-gray-500">Online</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <p className="text-lg font-bold text-green-600">{quorum.presenciais || 0}</p>
          <p className="text-xs text-gray-500">Presencial</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <p className="text-lg font-bold text-purple-600">{quorum.procuracoes || 0}</p>
          <p className="text-xs text-gray-500">Procuração</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
          <p className="text-lg font-bold text-amber-600">{quorum.votos_antecipados || 0}</p>
          <p className="text-xs text-gray-500">Antecipado</p>
        </div>
      </div>
    </div>
  );
}
