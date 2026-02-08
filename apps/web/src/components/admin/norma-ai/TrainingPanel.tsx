'use client';

import { useNormaAI } from '@/hooks/useNormaAI';
import { useEffect } from 'react';

export function TrainingPanel() {
  const { metrics, documents, loading, error, fetchMetrics, fetchDocuments } = useNormaAI();

  useEffect(() => {
    fetchMetrics();
    fetchDocuments();
  }, [fetchMetrics, fetchDocuments]);

  const totalChunks = metrics?.totalChunks ?? 0;
  const totalDocs = metrics?.totalDocuments ?? 0;
  const lastProcessed = documents
    .filter((d) => d.processed_at)
    .sort((a, b) => new Date(b.processed_at!).getTime() - new Date(a.processed_at!).getTime())[0];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Treinamento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gerencie a base de conhecimento e acompanhe o treinamento da IA
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-3xl font-bold text-indigo-600">{loading ? '...' : totalDocs}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Documentos na base</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-3xl font-bold text-indigo-600">{loading ? '...' : totalChunks}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Chunks indexados</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-3xl font-bold text-indigo-600">
            {lastProcessed
              ? new Date(lastProcessed.processed_at!).toLocaleDateString('pt-BR')
              : 'N/A'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Último processamento</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Ações Rápidas</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href="/admin/norma-ai/knowledge"
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-2xl text-indigo-500">add_circle</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Adicionar Conhecimento</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Criar entrada manual ou fazer upload de PDF
              </p>
            </div>
          </a>
          <a
            href="/admin/norma-ai/conversations"
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined text-2xl text-indigo-500">chat</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Ver Conversas</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analisar interações dos usuários com a IA
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-800 dark:bg-indigo-900/20">
        <h3 className="mb-3 text-lg font-semibold text-indigo-900 dark:text-indigo-200">
          Como melhorar a IA Norma
        </h3>
        <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base">check_circle</span>
            <span>
              <strong>Adicione o regimento interno</strong> do condomínio como documento PDF para
              que a Norma possa responder perguntas sobre regras.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base">check_circle</span>
            <span>
              <strong>Crie entradas manuais</strong> para perguntas frequentes que não estão nos
              documentos oficiais.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base">check_circle</span>
            <span>
              <strong>Revise as conversas</strong> periodicamente para identificar perguntas que a
              IA não soube responder.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="material-symbols-outlined mt-0.5 text-base">check_circle</span>
            <span>
              <strong>Categorize os documentos</strong> corretamente para melhorar a precisão das
              respostas.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
