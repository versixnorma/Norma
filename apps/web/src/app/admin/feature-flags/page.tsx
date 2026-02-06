'use client';
import { AuthGuard } from '@/contexts/AuthContext';
import { useFeatureFlags, type FeatureFlag } from '@/hooks/useFeatureFlags';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

type AmbienteType = 'all' | 'development' | 'staging' | 'production';

export default function FeatureFlagsPage() {
  const { flags, loading, updateFlag, createFlag, deleteFlag } = useFeatureFlags();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlag, setNewFlag] = useState({
    key: '',
    nome: '',
    descricao: '',
    is_enabled: false,
    ambiente: 'all' as AmbienteType,
    config: {},
    condominio_ids: null as string[] | null,
  });

  const handleToggle = async (flag: FeatureFlag) => {
    const success = await updateFlag(flag.id, { is_enabled: !flag.is_enabled });
    if (success) toast.success(`${flag.nome} ${!flag.is_enabled ? 'ativado' : 'desativado'}`);
    else toast.error('Erro ao atualizar');
  };
  const handleCreate = async () => {
    if (!newFlag.key || !newFlag.nome) {
      toast.error('Preencha key e nome');
      return;
    }
    const result = await createFlag(newFlag);
    if (result) {
      toast.success('Flag criada');
      setShowCreateModal(false);
      setNewFlag({
        key: '',
        nome: '',
        descricao: '',
        is_enabled: false,
        ambiente: 'all',
        config: {},
        condominio_ids: null,
      });
    } else toast.error('Erro ao criar');
  };
  const handleDelete = async (flag: FeatureFlag) => {
    if (!confirm(`Deletar "${flag.nome}"?`)) return;
    const success = await deleteFlag(flag.id);
    if (success) toast.success('Flag deletada');
    else toast.error('Erro ao deletar');
  };

  return (
    <AuthGuard requiredRoles={['superadmin']}>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/dashboard"
                  className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                    arrow_back
                  </span>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Feature Flags
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">Gerenciar funcionalidades</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
              >
                <span className="material-symbols-outlined">add</span>Nova Flag
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : flags.length === 0 ? (
            <div className="rounded-2xl bg-white py-12 text-center dark:bg-card-dark">
              <span className="material-symbols-outlined mb-3 text-5xl text-gray-400">
                toggle_off
              </span>
              <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">
                Nenhuma feature flag
              </h3>
              <p className="text-sm text-gray-500">Crie a primeira flag</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-card-dark"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="font-semibold text-gray-800 dark:text-white">{flag.nome}</h3>
                        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-800">
                          {flag.key}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs ${flag.ambiente === 'all' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {flag.ambiente}
                        </span>
                      </div>
                      {flag.descricao && <p className="text-sm text-gray-500">{flag.descricao}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(flag)}
                        className={`relative h-8 w-14 rounded-full transition-colors ${flag.is_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${flag.is_enabled ? 'left-7' : 'left-1'}`}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(flag)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-card-dark">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Nova Feature Flag
                </h3>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Key
                  </label>
                  <input
                    type="text"
                    value={newFlag.key}
                    onChange={(e) =>
                      setNewFlag({
                        ...newFlag,
                        key: e.target.value.toLowerCase().replace(/\s/g, '_'),
                      })
                    }
                    className="mt-1 w-full rounded-lg border-none bg-gray-100 px-4 py-2 dark:bg-gray-800"
                    placeholder="minha_feature"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={newFlag.nome}
                    onChange={(e) => setNewFlag({ ...newFlag, nome: e.target.value })}
                    className="mt-1 w-full rounded-lg border-none bg-gray-100 px-4 py-2 dark:bg-gray-800"
                    placeholder="Minha Feature"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrição
                  </label>
                  <textarea
                    value={newFlag.descricao}
                    onChange={(e) => setNewFlag({ ...newFlag, descricao: e.target.value })}
                    className="mt-1 w-full resize-none rounded-lg border-none bg-gray-100 px-4 py-2 dark:bg-gray-800"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ambiente
                  </label>
                  <select
                    value={newFlag.ambiente}
                    onChange={(e) =>
                      setNewFlag({ ...newFlag, ambiente: e.target.value as AmbienteType })
                    }
                    className="mt-1 w-full rounded-lg border-none bg-gray-100 px-4 py-2 dark:bg-gray-800"
                  >
                    <option value="all">Todos</option>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="rounded-lg bg-primary px-4 py-2 font-medium text-white"
                >
                  Criar Flag
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
