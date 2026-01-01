'use client';

import type {
  UpdatePreferenciasInput,
  UsuarioCanaisPreferencias,
} from '@versix/shared/types/comunicacao';
import { useState } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================
type CanalToggleKey = keyof Pick<
  UpdatePreferenciasInput,
  | 'push_habilitado'
  | 'email_habilitado'
  | 'in_app_habilitado'
  | 'whatsapp_habilitado'
  | 'sms_habilitado'
  | 'voz_habilitado'
>;

type TipoToggleKey = keyof Pick<
  UpdatePreferenciasInput,
  | 'receber_comunicados'
  | 'receber_avisos'
  | 'receber_alertas'
  | 'receber_emergencias'
  | 'receber_lembretes'
  | 'receber_cobrancas'
  | 'receber_assembleias'
  | 'receber_ocorrencias'
  | 'receber_chamados'
>;

interface CanalConfig {
  key: CanalToggleKey;
  label: string;
  icon: string;
  desc: string;
}

interface TipoConfig {
  key: TipoToggleKey;
  label: string;
  desc: string;
}

interface PreferenciasCanaisProps {
  preferencias: UsuarioCanaisPreferencias;
  onSave: (input: UpdatePreferenciasInput) => Promise<boolean>;
  loading?: boolean;
}

export function PreferenciasCanais({ preferencias, onSave, loading }: PreferenciasCanaisProps) {
  const [form, setForm] = useState<UpdatePreferenciasInput>({
    push_habilitado: preferencias.push_habilitado,
    email_habilitado: preferencias.email_habilitado,
    in_app_habilitado: preferencias.in_app_habilitado,
    whatsapp_habilitado: preferencias.whatsapp_habilitado,
    sms_habilitado: preferencias.sms_habilitado,
    voz_habilitado: preferencias.voz_habilitado,
    receber_comunicados: preferencias.receber_comunicados,
    receber_avisos: preferencias.receber_avisos,
    receber_alertas: preferencias.receber_alertas,
    receber_emergencias: preferencias.receber_emergencias,
    receber_lembretes: preferencias.receber_lembretes,
    receber_cobrancas: preferencias.receber_cobrancas,
    receber_assembleias: preferencias.receber_assembleias,
    receber_ocorrencias: preferencias.receber_ocorrencias,
    receber_chamados: preferencias.receber_chamados,
    horario_inicio_preferido: preferencias.horario_inicio_preferido,
    horario_fim_preferido: preferencias.horario_fim_preferido,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (
    key: keyof UpdatePreferenciasInput,
    value: string | number | boolean | null
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(form);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const canais: CanalConfig[] = [
    {
      key: 'push_habilitado',
      label: 'Notificações Push',
      icon: 'notifications',
      desc: 'Notificações no celular',
    },
    { key: 'email_habilitado', label: 'Email', icon: 'email', desc: 'Receber por email' },
    {
      key: 'in_app_habilitado',
      label: 'Mural',
      icon: 'dashboard',
      desc: 'Mensagens no mural do app',
    },
    { key: 'whatsapp_habilitado', label: 'WhatsApp', icon: 'chat', desc: 'Mensagens no WhatsApp' },
    { key: 'sms_habilitado', label: 'SMS', icon: 'sms', desc: 'Mensagens de texto' },
    { key: 'voz_habilitado', label: 'Ligação', icon: 'call', desc: 'Ligação em casos críticos' },
  ];

  const tipos: TipoConfig[] = [
    { key: 'receber_comunicados', label: 'Comunicados', desc: 'Comunicações gerais do condomínio' },
    { key: 'receber_avisos', label: 'Avisos', desc: 'Avisos e notificações importantes' },
    { key: 'receber_alertas', label: 'Alertas', desc: 'Alertas de segurança e manutenção' },
    { key: 'receber_lembretes', label: 'Lembretes', desc: 'Lembretes de datas e eventos' },
    { key: 'receber_cobrancas', label: 'Cobranças', desc: 'Avisos de cobranças e boletos' },
    { key: 'receber_assembleias', label: 'Assembleias', desc: 'Convocações de assembleias' },
    {
      key: 'receber_ocorrencias',
      label: 'Ocorrências',
      desc: 'Registros de ocorrências do condomínio',
    },
    { key: 'receber_chamados', label: 'Chamados', desc: 'Atualizações de chamados e solicitações' },
  ];

  return (
    <div className="space-y-6">
      {/* CANAIS */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <h3 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
            <span className="material-symbols-outlined">tune</span>
            Canais de Notificação
          </h3>
          <p className="mt-1 text-sm text-gray-500">Escolha quais canais deseja usar</p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {canais.map((canal) => (
            <div key={canal.key} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                    {canal.icon}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{canal.label}</p>
                  <p className="text-sm text-gray-500">{canal.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form[canal.key] || false}
                  onChange={(e) => handleChange(canal.key, e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* TIPOS */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
        <div className="border-b border-gray-100 p-4 dark:border-gray-700">
          <h3 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
            <span className="material-symbols-outlined">category</span>
            Tipos de Notificação
          </h3>
          <p className="mt-1 text-sm text-gray-500">Escolha quais tipos deseja receber</p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {tipos.map((tipo) => (
            <div key={tipo.key} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{tipo.label}</p>
                <p className="text-sm text-gray-500">{tipo.desc}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form[tipo.key] || false}
                  onChange={(e) => handleChange(tipo.key, e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* HORÁRIOS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-card-dark">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
          <span className="material-symbols-outlined">schedule</span>
          Horários Preferidos
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Início</label>
            <input
              type="time"
              value={form.horario_inicio_preferido || ''}
              onChange={(e) => handleChange('horario_inicio_preferido', e.target.value || null)}
              className="mt-2 w-full rounded-lg border-none bg-gray-100 px-3 py-2 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fim</label>
            <input
              type="time"
              value={form.horario_fim_preferido || ''}
              onChange={(e) => handleChange('horario_fim_preferido', e.target.value || null)}
              className="mt-2 w-full rounded-lg border-none bg-gray-100 px-3 py-2 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <button
        onClick={handleSave}
        disabled={saving || loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-white disabled:opacity-50"
      >
        {saving ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : saved ? (
          <span className="material-symbols-outlined">check</span>
        ) : (
          <span className="material-symbols-outlined">save</span>
        )}
        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Preferências'}
      </button>
    </div>
  );
}
