'use client';

import type { AssembleiaComJoins } from '@versix/shared';
import Link from 'next/link';

interface AssembleiaCardProps {
  assembleia: AssembleiaComJoins;
  isSindico?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600', icon: 'edit_note' },
  convocada: { label: 'Convocada', color: 'bg-blue-100 text-blue-700', icon: 'campaign' },
  em_andamento: { label: 'Em andamento', color: 'bg-green-100 text-green-700', icon: 'play_circle' },
  votacao: { label: 'Votação aberta', color: 'bg-amber-100 text-amber-700', icon: 'how_to_vote' },
  encerrada: { label: 'Encerrada', color: 'bg-purple-100 text-purple-700', icon: 'task_alt' },
  arquivada: { label: 'Arquivada', color: 'bg-gray-100 text-gray-500', icon: 'inventory_2' }
};

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  AGO: { label: 'AGO', color: 'bg-primary text-white' },
  AGE: { label: 'AGE', color: 'bg-amber-500 text-white' },
  permanente: { label: 'Permanente', color: 'bg-teal-500 text-white' }
};

export function AssembleiaCard({ assembleia, isSindico }: AssembleiaCardProps) {
  const status = assembleia.status ? STATUS_CONFIG[assembleia.status] : STATUS_CONFIG['rascunho'];
  const tipo = assembleia.tipo ? TIPO_CONFIG[assembleia.tipo] : TIPO_CONFIG['AGO'];
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const href = isSindico ? `/sindico/assembleias/${assembleia.id}` : `/assembleias/${assembleia.id}`;

  return (
    <Link href={href} className="block bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-lg font-bold ${tipo.color}`}>{tipo.label}</span>
          {assembleia.numero_sequencial && <span className="text-xs text-gray-500">#{assembleia.numero_sequencial}</span>}
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
          <span className="material-symbols-outlined text-sm">{status.icon}</span>
          {status.label}
        </span>
      </div>

      <h3 className="font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2">{assembleia.titulo}</h3>

      {assembleia.descricao && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{assembleia.descricao}</p>}

      <div className="flex items-center gap-4 text-xs text-gray-400">
        {assembleia.data_primeira_convocacao && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {formatDate(assembleia.data_primeira_convocacao)}
          </span>
        )}
        {assembleia.pautas && assembleia.pautas.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">list</span>
            {assembleia.pautas.length} pauta(s)
          </span>
        )}
        {(assembleia.quorum_atingido ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">groups</span>
            {assembleia.quorum_atingido?.toFixed(1)}% quórum
          </span>
        )}
      </div>

      {assembleia.status === 'em_andamento' && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Ao vivo agora</span>
          </div>
        </div>
      )}
    </Link>
  );
}
