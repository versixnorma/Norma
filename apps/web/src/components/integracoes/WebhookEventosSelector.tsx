'use client';

import type { WebhookEvento } from '@versix/shared';
import { useState } from 'react';

interface WebhookEventosSelectorProps {
  selected: WebhookEvento[];
  onChange: (eventos: WebhookEvento[]) => void;
}

const EVENTOS_GRUPOS: { grupo: string; icon: string; eventos: { value: WebhookEvento; label: string }[] }[] = [
  {
    grupo: 'Comunicação',
    icon: 'campaign',
    eventos: [
      { value: 'comunicado.publicado', label: 'Comunicado publicado' }
    ]
  },
  {
    grupo: 'Assembleias',
    icon: 'groups',
    eventos: [
      { value: 'assembleia.criada', label: 'Assembleia criada' },
      { value: 'assembleia.convocada', label: 'Assembleia convocada' },
      { value: 'assembleia.iniciada', label: 'Assembleia iniciada' },
      { value: 'assembleia.encerrada', label: 'Assembleia encerrada' },
      { value: 'assembleia.voto_registrado', label: 'Voto registrado' }
    ]
  },
  {
    grupo: 'Financeiro',
    icon: 'payments',
    eventos: [
      { value: 'cobranca.gerada', label: 'Cobrança gerada' },
      { value: 'cobranca.vencendo', label: 'Cobrança vencendo' },
      { value: 'pagamento.confirmado', label: 'Pagamento confirmado' },
      { value: 'pagamento.atrasado', label: 'Pagamento atrasado' },
      { value: 'lancamento.criado', label: 'Lançamento criado' },
      { value: 'lancamento.atualizado', label: 'Lançamento atualizado' },
      { value: 'prestacao.publicada', label: 'Prestação publicada' }
    ]
  },
  {
    grupo: 'Ocorrências',
    icon: 'report',
    eventos: [
      { value: 'ocorrencia.criada', label: 'Ocorrência criada' },
      { value: 'ocorrencia.atualizada', label: 'Ocorrência atualizada' },
      { value: 'ocorrencia.resolvida', label: 'Ocorrência resolvida' }
    ]
  },
  {
    grupo: 'Chamados',
    icon: 'support_agent',
    eventos: [
      { value: 'chamado.criado', label: 'Chamado criado' },
      { value: 'chamado.atualizado', label: 'Chamado atualizado' },
      { value: 'chamado.fechado', label: 'Chamado fechado' }
    ]
  },
  {
    grupo: 'Moradores',
    icon: 'person',
    eventos: [
      { value: 'morador.cadastrado', label: 'Morador cadastrado' },
      { value: 'morador.aprovado', label: 'Morador aprovado' },
      { value: 'morador.removido', label: 'Morador removido' },
      { value: 'morador.atualizado', label: 'Morador atualizado' }
    ]
  },
  {
    grupo: 'Reservas',
    icon: 'event',
    eventos: [
      { value: 'reserva.criada', label: 'Reserva criada' },
      { value: 'reserva.aprovada', label: 'Reserva aprovada' },
      { value: 'reserva.cancelada', label: 'Reserva cancelada' }
    ]
  }
];

export function WebhookEventosSelector({ selected, onChange }: WebhookEventosSelectorProps) {
  const [expandedGrupo, setExpandedGrupo] = useState<string | null>(null);

  const toggleEvento = (evento: WebhookEvento) => {
    if (selected.includes(evento)) {
      onChange(selected.filter(e => e !== evento));
    } else {
      onChange([...selected, evento]);
    }
  };

  const toggleGrupo = (grupo: string) => {
    const eventosGrupo = EVENTOS_GRUPOS.find(g => g.grupo === grupo)?.eventos.map(e => e.value) || [];
    const todosSelected = eventosGrupo.every(e => selected.includes(e));

    if (todosSelected) {
      onChange(selected.filter(e => !eventosGrupo.includes(e)));
    } else {
      onChange([...new Set([...selected, ...eventosGrupo])]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Eventos ({selected.length} selecionados)
      </label>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {EVENTOS_GRUPOS.map(grupo => {
          const eventosGrupo = grupo.eventos.map(e => e.value);
          const selectedCount = eventosGrupo.filter(e => selected.includes(e)).length;
          const isExpanded = expandedGrupo === grupo.grupo;

          return (
            <div key={grupo.grupo} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
              <button
                type="button"
                onClick={() => setExpandedGrupo(isExpanded ? null : grupo.grupo)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-500">{grupo.icon}</span>
                  <span className="font-medium">{grupo.grupo}</span>
                  {selectedCount > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">{selectedCount}</span>
                  )}
                </div>
                <span className="material-symbols-outlined text-gray-400">
                  {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isExpanded && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.grupo)}
                    className="text-sm text-primary font-medium"
                  >
                    {selectedCount === eventosGrupo.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>

                  {grupo.eventos.map(evento => (
                    <label key={evento.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(evento.value)}
                        onChange={() => toggleEvento(evento.value)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <span className="text-sm">{evento.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
