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
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all dark:border-gray-700 dark:bg-card-dark ${faq.destaque ? 'ring-2 ring-primary/20' : ''}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {faq.destaque && (
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10"
            aria-label="Destaque"
          >
            <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">
              star
            </span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3
            id={`faq-question-${faq.id}`}
            className="pr-8 font-semibold text-gray-800 dark:text-white"
          >
            {faq.pergunta}
          </h3>
          {faq.categoria && (
            <span className="mt-1 inline-block text-xs text-primary">{faq.categoria}</span>
          )}
        </div>
        <span
          className={`material-symbols-outlined text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {expanded && (
        <div
          id={contentId}
          className="border-t border-gray-100 px-5 pb-5 dark:border-gray-700"
          role="region"
          aria-labelledby={`faq-question-${faq.id}`}
        >
          <div className="whitespace-pre-wrap pt-4 text-gray-600 dark:text-gray-300">
            {faq.resposta}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
            {!editable && onVote && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Foi útil?</span>
                <div
                  className="flex items-center gap-2"
                  role="group"
                  aria-label="Avaliação da resposta"
                >
                  <button
                    onClick={() => handleVote(true)}
                    disabled={voted !== null}
                    aria-label={`Resposta útil (${faq.votos_util ?? 0} votos)`}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${voted === true ? 'bg-green-100 text-green-700' : voted !== null ? 'cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-green-50'}`}
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                      thumb_up
                    </span>
                    <span>{faq.votos_util ?? 0}</span>
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    disabled={voted !== null}
                    aria-label={`Resposta não útil (${faq.votos_inutil ?? 0} votos)`}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${voted === false ? 'bg-red-100 text-red-700' : voted !== null ? 'cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-red-50'}`}
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                      thumb_down
                    </span>
                    <span>{faq.votos_inutil ?? 0}</span>
                  </button>
                </div>
              </div>
            )}

            {editable && (
              <div
                className="ml-auto flex items-center gap-2"
                role="group"
                aria-label="Ações de edição"
              >
                <button
                  onClick={onEdit}
                  aria-label="Editar pergunta"
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    edit
                  </span>
                </button>
                <button
                  onClick={onDelete}
                  aria-label="Excluir pergunta"
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    delete
                  </span>
                </button>
              </div>
            )}

            <div
              className="flex items-center gap-2 text-xs text-gray-400"
              aria-label={`${faq.visualizacoes} visualizações`}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                visibility
              </span>
              <span>{faq.visualizacoes} visualizações</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
