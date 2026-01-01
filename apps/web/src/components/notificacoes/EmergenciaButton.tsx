'use client';

import type { TipoEmergencia } from '@versix/shared/types/comunicacao';
import { useState } from 'react';

interface EmergenciaButtonProps {
  onDisparar: (tipo: TipoEmergencia, descricao: string) => Promise<void>;
}

const TIPOS_EMERGENCIA: { tipo: TipoEmergencia; label: string; icon: string; color: string }[] = [
  { tipo: 'incendio', label: 'Incêndio', icon: 'local_fire_department', color: 'bg-red-600' },
  { tipo: 'gas', label: 'Vazamento de Gás', icon: 'propane', color: 'bg-amber-600' },
  { tipo: 'seguranca', label: 'Segurança', icon: 'shield', color: 'bg-blue-600' },
  { tipo: 'medica', label: 'Emergência Médica', icon: 'medical_services', color: 'bg-green-600' },
  { tipo: 'outro', label: 'Outra Emergência', icon: 'warning', color: 'bg-gray-600' }
];

export function EmergenciaButton({ onDisparar }: EmergenciaButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'tipo' | 'descricao' | 'confirmar'>('tipo');
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoEmergencia | null>(null);
  const [descricao, setDescricao] = useState('');
  const [disparando, setDisparando] = useState(false);

  const handleSelectTipo = (tipo: TipoEmergencia) => {
    setTipoSelecionado(tipo);
    setStep('descricao');
  };

  const handleConfirmar = () => {
    if (descricao.length >= 10) {
      setStep('confirmar');
    }
  };

  const handleDisparar = async () => {
    if (!tipoSelecionado) return;
    setDisparando(true);
    await onDisparar(tipoSelecionado, descricao);
    setDisparando(false);
    setShowModal(false);
    setStep('tipo');
    setTipoSelecionado(null);
    setDescricao('');
  };

  const handleClose = () => {
    setShowModal(false);
    setTimeout(() => {
      setStep('tipo');
      setTipoSelecionado(null);
      setDescricao('');
    }, 300);
  };

  const tipoConfig = TIPOS_EMERGENCIA.find(t => t.tipo === tipoSelecionado);

  return (
    <>
      {/* Botão SOS */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-16 h-16 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 animate-pulse hover:animate-none hover:bg-red-700 transition-colors"
      >
        <span className="material-symbols-outlined text-3xl">sos</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="bg-white dark:bg-card-dark w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">emergency</span>
                <h2 className="font-bold text-lg">EMERGÊNCIA</h2>
              </div>
              <button onClick={handleClose} className="p-1 hover:bg-red-700 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4">
              {step === 'tipo' && (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Selecione o tipo de emergência:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TIPOS_EMERGENCIA.map(t => (
                      <button
                        key={t.tipo}
                        onClick={() => handleSelectTipo(t.tipo)}
                        className={`p-4 rounded-xl ${t.color} text-white flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
                      >
                        <span className="material-symbols-outlined text-3xl">{t.icon}</span>
                        <span className="font-medium text-sm">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 'descricao' && (
                <>
                  <button onClick={() => setStep('tipo')} className="flex items-center gap-1 text-gray-500 mb-4">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Voltar
                  </button>

                  <div className={`flex items-center gap-2 p-3 rounded-xl ${tipoConfig?.color} text-white mb-4`}>
                    <span className="material-symbols-outlined">{tipoConfig?.icon}</span>
                    <span className="font-medium">{tipoConfig?.label}</span>
                  </div>

                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descreva a emergência *
                  </label>
                  <textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none resize-none"
                    rows={4}
                    placeholder="Ex: Fogo no apartamento 302, muito fumaça..."
                  />
                  <p className="text-xs text-gray-400 mt-1">{descricao.length}/10 mínimo</p>

                  <button
                    onClick={handleConfirmar}
                    disabled={descricao.length < 10}
                    className="w-full mt-4 py-4 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    Continuar
                  </button>
                </>
              )}

              {step === 'confirmar' && (
                <>
                  <div className="text-center py-4">
                    <span className="material-symbols-outlined text-6xl text-red-500 animate-pulse">warning</span>
                    <h3 className="text-xl font-bold mt-4 text-gray-800 dark:text-white">Confirmar Disparo?</h3>
                    <p className="text-gray-500 mt-2">
                      Isso irá notificar <strong>TODOS</strong> os moradores por:
                    </p>
                    <div className="flex justify-center gap-4 mt-4 text-sm">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-green-500">call</span>Ligação</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-blue-500">sms</span>SMS</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-purple-500">notifications</span>Push</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setStep('descricao')}
                      className="flex-1 py-4 bg-gray-200 dark:bg-gray-700 rounded-xl font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDisparar}
                      disabled={disparando}
                      className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {disparando ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined">send</span>
                      )}
                      {disparando ? 'Disparando...' : 'DISPARAR AGORA'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
