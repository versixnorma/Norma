'use client';

import { EmergenciaButton } from '@/components/notificacoes/EmergenciaButton';
import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useEmergencias } from '@/hooks/useEmergencias';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { usePreferenciasCanais } from '@/hooks/usePreferenciasCanais';
import type {
  CreateNotificacaoInput,
  NotificacaoDashboard,
  PrioridadeComunicado,
  TipoEmergencia,
} from '@versix/shared/types/comunicacao';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SindicoComunicacaoPage() {
  const { profile } = useAuthContext();
  const { enviarNotificacao, fetchDashboard } = useNotificacoes();
  const { config, fetchConfigCondominio, updateConfig } = usePreferenciasCanais();
  const { emergencias, fetchEmergencias, dispararEmergencia } = useEmergencias();

  const [dashboard, setDashboard] = useState<NotificacaoDashboard[]>([]);
  const [tab, setTab] = useState<'enviar' | 'historico' | 'config' | 'emergencias'>('enviar');
  const [form, setForm] = useState<CreateNotificacaoInput>({
    tipo: 'comunicado',
    titulo: '',
    corpo: '',
    prioridade: 'normal',
    destinatarios_tipo: 'todos',
    gerar_mural: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) {
      fetchDashboard(condominioId).then(setDashboard);
      fetchConfigCondominio(condominioId);
      fetchEmergencias(condominioId);
    }
  }, [condominioId, fetchDashboard, fetchConfigCondominio, fetchEmergencias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condominioId) return;
    if (form.titulo.length < 3) {
      toast.error('Título muito curto');
      return;
    }
    if (form.corpo.length < 10) {
      toast.error('Corpo muito curto');
      return;
    }

    setSubmitting(true);
    const id = await enviarNotificacao(condominioId, form);
    if (id) {
      toast.success('Notificação enviada com sucesso!');
      setForm({
        tipo: 'comunicado',
        titulo: '',
        corpo: '',
        prioridade: 'normal',
        destinatarios_tipo: 'todos',
        gerar_mural: false,
      });
      fetchDashboard(condominioId).then(setDashboard);
    }
    setSubmitting(false);
  };

  const handleEmergencia = async (tipo: TipoEmergencia, descricao: string) => {
    if (!condominioId) return;
    const id = await dispararEmergencia(condominioId, { tipo, descricao });
    if (id) {
      toast.success('Emergência disparada!');
      fetchEmergencias(condominioId);
    }
  };

  return (
    <AuthGuard requiredRoles={['sindico']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="mb-4 flex items-center gap-4">
              <Link
                href="/home"
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  Central de Comunicação
                </h1>
                <p className="text-sm text-gray-500">{profile?.condominio_atual?.nome}</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(['enviar', 'historico', 'config', 'emergencias'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium ${tab === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}
                >
                  {t === 'enviar'
                    ? '📤 Enviar'
                    : t === 'historico'
                      ? '📊 Histórico'
                      : t === 'config'
                        ? '⚙️ Config'
                        : '🚨 Emergências'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          {tab === 'enviar' && (
            <div className="max-w-2xl">
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-card-dark"
              >
                <h2 className="mb-4 text-lg font-bold">Nova Notificação</h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                      className="mt-1 w-full rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                    >
                      <option value="comunicado">Comunicado</option>
                      <option value="cobranca">Cobrança</option>
                      <option value="assembleia">Assembleia</option>
                      <option value="manutencao">Manutenção</option>
                      <option value="aviso">Aviso</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Título *</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                      className="mt-1 w-full rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                      placeholder="Ex: Manutenção programada dos elevadores"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Mensagem *</label>
                    <textarea
                      value={form.corpo}
                      onChange={(e) => setForm({ ...form, corpo: e.target.value })}
                      className="mt-1 w-full resize-none rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                      rows={5}
                      placeholder="Escreva a mensagem completa..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Prioridade</label>
                      <select
                        value={form.prioridade}
                        onChange={(e) =>
                          setForm({ ...form, prioridade: e.target.value as PrioridadeComunicado })
                        }
                        className="mt-1 w-full rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                      >
                        <option value="baixa">🟢 Baixa</option>
                        <option value="normal">🔵 Normal</option>
                        <option value="alta">🟡 Alta</option>
                        <option value="critica">🔴 Crítica</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Destinatários</label>
                      <select
                        value={form.destinatarios_tipo}
                        onChange={(e) => setForm({ ...form, destinatarios_tipo: e.target.value })}
                        className="mt-1 w-full rounded-xl border-none bg-gray-100 px-4 py-3 dark:bg-gray-800"
                      >
                        <option value="todos">Todos</option>
                        <option value="bloco">Por Bloco</option>
                        <option value="role">Por Perfil</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={form.gerar_mural}
                      onChange={(e) => setForm({ ...form, gerar_mural: e.target.checked })}
                      className="h-5 w-5"
                    />
                    <div>
                      <span className="font-medium">Gerar Mural (PDF)</span>
                      <p className="text-sm text-gray-500">Criar versão para impressão</p>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="material-symbols-outlined">send</span>
                    )}
                    {submitting ? 'Enviando...' : 'Enviar Notificação'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'historico' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Histórico de Envios</h2>
              {dashboard.length === 0 ? (
                <p className="text-gray-500">Nenhuma notificação enviada ainda</p>
              ) : (
                <div className="grid gap-4">
                  {dashboard.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{n.titulo}</h3>
                          <p className="text-sm text-gray-500">
                            {n.tipo} • {new Date(n.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${n.percentual_leitura >= 80 ? 'bg-green-100 text-green-700' : n.percentual_leitura >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {n.percentual_leitura}% leram
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-sm">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white">
                            {n.total_destinatarios}
                          </p>
                          <p className="text-xs text-gray-500">Destino</p>
                        </div>
                        <div>
                          <p className="font-bold text-green-600">{n.total_lidos}</p>
                          <p className="text-xs text-gray-500">Lidos</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-600">{n.total_entregues}</p>
                          <p className="text-xs text-gray-500">Entregues</p>
                        </div>
                        <div>
                          <p className="font-bold text-red-600">{n.total_falhas}</p>
                          <p className="text-xs text-gray-500">Falhas</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'config' && config && (
            <div className="max-w-2xl space-y-4">
              <h2 className="text-lg font-bold">Configurações de Canais</h2>
              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
                {[
                  { key: 'push_habilitado', label: 'Push Notifications', icon: 'notifications' },
                  { key: 'email_habilitado', label: 'Email', icon: 'email' },
                  { key: 'whatsapp_habilitado', label: 'WhatsApp', icon: 'chat' },
                  { key: 'sms_habilitado', label: 'SMS', icon: 'sms' },
                  { key: 'voz_habilitado', label: 'Ligação TTS', icon: 'call' },
                ].map((canal) => (
                  <div key={canal.key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-gray-500">{canal.icon}</span>
                      <span>{canal.label}</span>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={
                          config && canal.key in config
                            ? (config as unknown as Record<string, boolean>)[canal.key]
                            : false
                        }
                        onChange={(e) =>
                          condominioId &&
                          updateConfig(condominioId, { [canal.key]: e.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
                <h3 className="mb-3 font-medium">Créditos Disponíveis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                    <p className="text-2xl font-bold text-primary">{config.creditos_sms}</p>
                    <p className="text-sm text-gray-500">SMS</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
                    <p className="text-2xl font-bold text-primary">{config.creditos_voz_minutos}</p>
                    <p className="text-sm text-gray-500">Minutos Voz</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'emergencias' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Histórico de Emergências</h2>
              {emergencias.length === 0 ? (
                <p className="text-gray-500">Nenhuma emergência registrada</p>
              ) : (
                <div className="space-y-3">
                  {emergencias.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                            {e.tipo.toUpperCase()}
                          </span>
                          <p className="mt-2 font-medium">{e.descricao}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {new Date(e.disparado_em).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p>
                            <strong>{e.total_destinatarios}</strong> notificados
                          </p>
                          {e.total_ligacoes && (
                            <p>
                              {e.total_atendidas}/{e.total_ligacoes} atendidas
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <EmergenciaButton onDisparar={handleEmergencia} />
      </div>
    </AuthGuard>
  );
}
