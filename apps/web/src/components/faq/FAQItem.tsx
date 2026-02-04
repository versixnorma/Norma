'use client';

import type { FAQ } from '@/hooks/useFAQ';
import { useState } from 'react';

interface FAQItemProps {
  faq: FAQ;
  onVote?: (useful: boolean) => void;
  editable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function FAQItem({ faq, onVote, editable = false, onEdit, onDelete }: FAQItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [voted, setVoted] = useState<boolean | null>(null);

  const handleVote = (useful: boolean) => {
    if (voted !== null) return;
    setVoted(useful);
    onVote?.(useful);
  };

  const contentId = `faq-content-${faq.id}`;

  return (
    <div className={`bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${faq.destaque ? 'ring-2 ring-primary/20' : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {faq.destaque && (
          <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0" aria-label="Destaque">
            <span className="material-symbols-outlined text-primary text-lg" aria-hidden="true">star</span>
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 id={`faq-question-${faq.id}`} className="font-semibold text-gray-800 dark:text-white pr-8">{faq.pergunta}</h3>
          {faq.categoria && <span className="text-xs text-primary mt-1 inline-block">{faq.categoria}</span>}
        </div>
        <span className={`material-symbols-outlined text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
      </button>

      {expanded && (
        <div id={contentId} className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700" role="region" aria-labelledby={`faq-question-${faq.id}`}>
          <div className="pt-4 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{faq.resposta}</div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {!editable && onVote && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Foi útil?</span>
                <div className="flex items-center gap-2" role="group" aria-label="Avaliação da resposta">
                  <button onClick={() => handleVote(true)} disabled={voted !== null} aria-label={`Resposta útil (${faq.votos_util ?? 0} votos)`} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${voted === true ? 'bg-green-100 text-green-700' : voted !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50 text-gray-600'}`}>
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">thumb_up</span>
                    <span>{faq.votos_util ?? 0}</span>
                  </button>
                  <button onClick={() => handleVote(false)} disabled={voted !== null} aria-label={`Resposta não útil (${faq.votos_inutil ?? 0} votos)`} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${voted === false ? 'bg-red-100 text-red-700' : voted !== null ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 text-gray-600'}`}>
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">thumb_down</span>
                    <span>{faq.votos_inutil ?? 0}</span>
                  </button>
                </div>
              </div>
            )}

            {editable && (
              <div className="flex items-center gap-2 ml-auto" role="group" aria-label="Ações de edição">
                <button onClick={onEdit} aria-label="Editar pergunta" className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                </button>
                <button onClick={onDelete} aria-label="Excluir pergunta" className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400" aria-label={`${faq.visualizacoes} visualizações`}>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">visibility</span>
              <span>{faq.visualizacoes} visualizações</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
