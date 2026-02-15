'use client';

import { type AdminUser } from '@/hooks/useAdmin';
import { useImpersonate } from '@/hooks/useImpersonate';
import type { Database } from '@/types/database';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

type StatusType = Database['public']['Enums']['user_status'];

interface UserFormData {
  nome: string;
  email: string;
  telefone: string;
  role: string;
  status: string;
  senha: string;
}

const EMPTY_FORM: UserFormData = {
  nome: '',
  email: '',
  telefone: '',
  role: 'morador',
  status: 'active',
  senha: '',
};

interface UserTableProps {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  updateUserStatus: (userId: string, status: StatusType) => Promise<boolean>;
  updateUserRole: (userId: string, role: string) => Promise<boolean>;
  createUser: (data: {
    nome: string;
    email: string;
    telefone?: string;
    role?: string;
    status?: string;
    senha?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (data: {
    id: string;
    nome?: string;
    email?: string;
    telefone?: string;
    role?: string;
    status?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  searchUsers: (query: string) => Promise<AdminUser[]>;
  onRefresh?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin_condo: 'Admin Condominio',
  sindico: 'Síndico',
  subsindico: 'Sub-síndico',
  conselheiro: 'Conselheiro',
  morador: 'Morador',
  porteiro: 'Porteiro',
  zelador: 'Zelador',
  funcionario: 'Funcionário',
  proprietario: 'Proprietário',
  inquilino: 'Inquilino',
};

// Roles that superadmin can assign to users
const ASSIGNABLE_ROLES = [
  'sindico',
  'subsindico',
  'conselheiro',
  'morador',
  'porteiro',
  'zelador',
  'funcionario',
  'proprietario',
  'inquilino',
] as const;
const STATUS_CONFIG: Record<StatusType, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-700' },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-700' },
  removed: { label: 'Removido', color: 'bg-red-100 text-red-700' },
};

export function UserTable({
  users,
  loading,
  error,
  updateUserStatus,
  updateUserRole,
  createUser,
  updateUser,
  searchUsers,
  onRefresh,
}: UserTableProps) {
  const { startImpersonate } = useImpersonate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [showImpersonateModal, setShowImpersonateModal] = useState<AdminUser | null>(null);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Create/Edit modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const displayUsers = searchQuery && searchResults.length > 0 ? searchResults : users;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchUsers(query);
      setSearchResults(results);
    } else setSearchResults([]);
  };
  const handleStatusChange = async (userId: string, newStatus: StatusType) => {
    setProcessing(userId);
    const success = await updateUserStatus(userId, newStatus);
    setProcessing(null);
    if (success) {
      toast.success('Status atualizado');
      onRefresh?.();
    } else toast.error('Erro ao atualizar status');
  };
  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessing(userId);
    const success = await updateUserRole(userId, newRole);
    setProcessing(null);
    if (success) {
      toast.success('Hierarquia atualizada');
      onRefresh?.();
    } else toast.error('Erro ao atualizar hierarquia');
  };
  const handleImpersonate = async () => {
    if (!showImpersonateModal || impersonateReason.length < 10) {
      toast.error('Motivo deve ter pelo menos 10 caracteres');
      return;
    }
    setProcessing(showImpersonateModal.id);
    const result = await startImpersonate(showImpersonateModal.id, impersonateReason);
    if (!result.success) {
      setProcessing(null);
      toast.error(result.error || 'Erro ao impersonar');
    }
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');

  // Open create modal
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setShowUserModal(true);
  };

  // Open edit modal
  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      telefone: user.telefone || '',
      role: user.condominios[0]?.role || 'morador',
      status: user.status,
      senha: '',
    });
    setShowUserModal(true);
  };

  // Close modal
  const closeUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
  };

  // Handle form submit
  const handleUserFormSubmit = async () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      toast.error('Nome e email sao obrigatorios');
      return;
    }

    setFormLoading(true);

    if (editingUser) {
      // Update
      const result = await updateUser({
        id: editingUser.id,
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone || undefined,
        role: formData.role,
        status: formData.status,
      });
      if (result.success) {
        toast.success('Usuario atualizado com sucesso');
        closeUserModal();
        onRefresh?.();
      } else {
        toast.error(result.error || 'Erro ao atualizar usuario');
      }
    } else {
      // Create
      const result = await createUser({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone || undefined,
        role: formData.role,
        status: formData.status,
        senha: formData.senha || undefined,
      });
      if (result.success) {
        toast.success('Usuario criado com sucesso');
        closeUserModal();
        onRefresh?.();
      } else {
        toast.error(result.error || 'Erro ao criar usuario');
      }
    }

    setFormLoading(false);
  };

  const updateField = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full rounded-xl border-none bg-gray-100 py-3 pl-12 pr-4 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="pending">Pendentes</option>
          <option value="inactive">Inativos</option>
          <option value="suspended">Suspensos</option>
        </select>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-white transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Novo Usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-card-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Condominio
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Hierarquia
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Cadastro
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && displayUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="mt-2 text-sm text-gray-500">Carregando usuarios...</p>
                  </td>
                </tr>
              )}
              {displayUsers
                .filter((u) => !selectedStatus || u.status === selectedStatus)
                .map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={`Foto de perfil de ${user.nome}`}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span
                              className="font-bold text-primary"
                              aria-label={`Iniciais de ${user.nome}`}
                            >
                              {user.nome.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{user.nome}</p>
                          <p className="max-w-[200px] truncate text-sm text-gray-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.condominios.length > 0 ? (
                        <div className="space-y-1">
                          {user.condominios.slice(0, 2).map((c, i) => (
                            <div key={i} className="text-sm">
                              <span className="text-gray-800 dark:text-white">
                                {c.condominio_nome}
                              </span>
                            </div>
                          ))}
                          {user.condominios.length > 2 && (
                            <span className="text-xs text-primary">
                              +{user.condominios.length - 2} mais
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sem condominio</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'superadmin' ? (
                        <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                          Super Admin
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={processing === user.id}
                          className="rounded-lg border-none bg-gray-100 px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[user.status]?.color || 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_CONFIG[user.status]?.label || user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                          title="Editar usuario"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <select
                          value={user.status}
                          onChange={(e) =>
                            handleStatusChange(user.id, e.target.value as StatusType)
                          }
                          disabled={processing === user.id}
                          className="rounded-lg border-none bg-gray-100 px-2 py-1 text-xs focus:ring-2 focus:ring-primary dark:bg-gray-800"
                        >
                          <option value="active">Ativar</option>
                          <option value="inactive">Inativar</option>
                          <option value="suspended">Suspender</option>
                          <option value="removed">Bloquear</option>
                        </select>
                        <button
                          onClick={() => setShowImpersonateModal(user)}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Impersonar usuario"
                        >
                          <span className="material-symbols-outlined text-lg">
                            admin_panel_settings
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {displayUsers.length === 0 && !loading && (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined mb-2 text-4xl text-gray-400">
              person_off
            </span>
            <p className="text-gray-500">Nenhum usuario encontrado</p>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-card-dark">
            <div className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-primary">
                  {editingUser ? 'edit' : 'person_add'}
                </span>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {editingUser ? 'Editar Usuario' : 'Novo Usuario'}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => updateField('nome', e.target.value)}
                    placeholder="Nome completo"
                    className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => updateField('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => updateField('role', e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                    >
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!editingUser && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Senha (opcional)
                    </label>
                    <input
                      type="password"
                      value={formData.senha}
                      onChange={(e) => updateField('senha', e.target.value)}
                      placeholder="Deixe vazio para gerar automaticamente"
                      className="w-full rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Se nao informada, uma senha aleatoria sera gerada
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={closeUserModal}
                className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleUserFormSubmit}
                disabled={formLoading || !formData.nome.trim() || !formData.email.trim()}
                className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {formLoading
                  ? 'Processando...'
                  : editingUser
                    ? 'Salvar Alteracoes'
                    : 'Criar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impersonate Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-card-dark">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-amber-500">
                  admin_panel_settings
                </span>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Impersonar Usuario
                </h3>
              </div>
              <div className="mb-4 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Voce ira visualizar o sistema como <strong>{showImpersonateModal.nome}</strong>.
                  Esta acao sera registrada no log de auditoria.
                </p>
              </div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Motivo do acesso (obrigatorio)
              </label>
              <textarea
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="Ex: Suporte ao usuario para resolucao de problema com boleto..."
                className="w-full resize-none rounded-xl border-none bg-gray-100 px-4 py-3 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-white"
                rows={3}
              />
              <p className="mt-1 text-xs text-gray-500">Minimo de 10 caracteres</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowImpersonateModal(null);
                  setImpersonateReason('');
                }}
                className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleImpersonate}
                disabled={impersonateReason.length < 10 || processing === showImpersonateModal.id}
                className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {processing ? 'Processando...' : 'Iniciar Impersonate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
