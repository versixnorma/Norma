'use client';

import { IntegracaoCard } from '@/components/integracoes/IntegracaoCard';
import { WebhookEventosSelector } from '@/components/integracoes/WebhookEventosSelector';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useIntegracoes } from '@/hooks/useIntegracoes';
import type { CreateIntegracaoApiInput, CreateWebhookInput } from '@versix/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function IntegracoesPage() {
  const { profile } = useAuthContext();
  const { integracoes, loading, fetchIntegracoes, criarIntegracaoApi, criarWebhook } = useIntegracoes();

  const [tab, setTab] = useState<'lista' | 'api' | 'webhook'>('lista');
  const [novaChave, setNovaChave] = useState<{ api_key: string; secret_key: string } | null>(null);

  const [apiForm, setApiForm] = useState<CreateIntegracaoApiInput>({ nome: '', descricao: '', scopes: [] });
  const [webhookForm, setWebhookForm] = useState<CreateWebhookInput>({ nome: '', url_destino: '', eventos: [], headers_custom: {} });
  const [submitting, setSubmitting] = useState(false);

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) {
      fetchIntegracoes(condominioId);
    }
  }, [condominioId, fetchIntegracoes]);

  const handleCriarApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || apiForm.nome.length < 3) return;
    setSubmitting(true);
    const result = await criarIntegracaoApi(condominioId, apiForm);
    if (result) {
      setNovaChave({ api_key: result.api_key, secret_key: result.secret_key });
      toast.success('API criada com sucesso!');
      fetchIntegracoes(condominioId);
    }
    setSubmitting(false);
  };

  const handleCriarWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId || webhookForm.nome.length < 3 || webhookForm.eventos.length === 0) return;
    setSubmitting(true);
    const result = await criarWebhook(condominioId, webhookForm);
    if (result) {
      setNovaChave({ api_key: '', secret_key: result.secret_key });
      toast.success('Webhook criado com sucesso!');
      fetchIntegracoes(condominioId);
      setWebhookForm({ nome: '', url_destino: '', eventos: [], headers_custom: {} });
    }
    setSubmitting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <AuthGuard requiredRoles={['sindico']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Integrações</h1>
                <p className="text-sm text-gray-500">APIs, Webhooks e Conectores</p>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['lista', 'api', 'webhook'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setNovaChave(null); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${tab === t ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
                  {t === 'lista' ? '📋 Lista' : t === 'api' ? '🔑 Nova API' : '🔗 Novo Webhook'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {tab === 'lista' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : integracoes.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl">
                  <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">hub</span>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma integração</h3>
                  <p className="text-gray-500 mb-4">Crie uma API ou Webhook para começar</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => setTab('api')} className="px-4 py-2 bg-primary text-white rounded-xl">Nova API</button>
                    <button onClick={() => setTab('webhook')} className="px-4 py-2 bg-purple-600 text-white rounded-xl">Novo Webhook</button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {integracoes.map(i => (<IntegracaoCard key={i.id} integracao={i} />))}
                </div>
              )}
            </div>
          )}

          {tab === 'api' && (
            <div className="max-w-xl">
              <form onSubmit={handleCriarApi} className="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><span className="material-symbols-outlined">api</span> Nova Chave API</h2>
                <p className="text-sm text-gray-500">Crie uma chave para integrar sistemas externos.</p>
                <div>
                  <label className="text-sm font-medium">Nome da Integração *</label>
                  <input type="text" value={apiForm.nome} onChange={e => setApiForm({ ...apiForm, nome: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Ex: Sistema Portaria" required minLength={3} />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea value={apiForm.descricao} onChange={e => setApiForm({ ...apiForm, descricao: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none resize-none" rows={2} />
                </div>
                <button type="submit" disabled={submitting || apiForm.nome.length < 3} className="w-full py-4 bg-primary text-white rounded-xl font-bold disabled:opacity-50">
                  {submitting ? 'Criando...' : 'Gerar Chave API'}
                </button>
              </form>
              {novaChave && novaChave.api_key && (
                <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-700">
                  <h3 className="font-bold text-green-800 dark:text-green-200 mb-4">✅ Chave Criada!</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">⚠️ Guarde essas chaves. Elas não serão exibidas novamente.</p>
                  <div className="space-y-3">
                    <div><label className="text-xs text-green-600">API Key</label>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                        <code className="flex-1 text-sm font-mono">{novaChave.api_key}</code>
                        <button type="button" onClick={() => copyToClipboard(novaChave.api_key)} className="p-1 hover:bg-gray-100 rounded"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                      </div>
                    </div>
                    <div><label className="text-xs text-green-600">Secret Key</label>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                        <code className="flex-1 text-sm font-mono">{novaChave.secret_key}</code>
                        <button type="button" onClick={() => copyToClipboard(novaChave.secret_key)} className="p-1 hover:bg-gray-100 rounded"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'webhook' && (
            <div className="max-w-xl">
              <form onSubmit={handleCriarWebhook} className="bg-white dark:bg-card-dark rounded-2xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><span className="material-symbols-outlined">webhook</span> Novo Webhook</h2>
                <p className="text-sm text-gray-500">Receba eventos em tempo real no seu sistema.</p>
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <input type="text" value={webhookForm.nome} onChange={e => setWebhookForm({ ...webhookForm, nome: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="Ex: Zapier Notificações" required minLength={3} />
                </div>
                <div>
                  <label className="text-sm font-medium">URL de Destino *</label>
                  <input type="url" value={webhookForm.url_destino} onChange={e => setWebhookForm({ ...webhookForm, url_destino: e.target.value })}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none" placeholder="https://hooks.zapier.com/..." required />
                </div>
                <WebhookEventosSelector selected={webhookForm.eventos} onChange={eventos => setWebhookForm({ ...webhookForm, eventos })} />
                <button type="submit" disabled={submitting || webhookForm.nome.length < 3 || webhookForm.eventos.length === 0}
                  className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-50">
                  {submitting ? 'Criando...' : 'Criar Webhook'}
                </button>
              </form>
              {novaChave && novaChave.secret_key && !novaChave.api_key && (
                <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-700">
                  <h3 className="font-bold text-purple-800 dark:text-purple-200 mb-4">✅ Webhook Criado!</h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">Use esta secret para validar assinaturas HMAC.</p>
                  <div><label className="text-xs text-purple-600">Secret Key</label>
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                      <code className="flex-1 text-sm font-mono">{novaChave.secret_key}</code>
                      <button type="button" onClick={() => copyToClipboard(novaChave.secret_key)} className="p-1 hover:bg-gray-100 rounded"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
