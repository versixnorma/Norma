'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { PASSWORD_RULES, passwordSchema } from '@/lib/schemas/auth';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, loading: authLoading } = useAuthContext();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [condominios, setCondominios] = useState<{ id: string; nome: string }[]>([]);
  const [blocos, setBlocos] = useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = useState<
    { id: string; numero: string; bloco_id: string | null; bloco_nome: string | null }[]
  >([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    bloco_id: '',
    unidade_id: '',
    notificacoes_email: true,
    notificacoes_push: true,
    notificacoes_whatsapp: false,
    password: '',
    confirmPassword: '',
    condominio_id: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Carregar lista de condomínios
  useEffect(() => {
    fetch('/api/condominios')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCondominios(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!formData.condominio_id) {
      setBlocos([]);
      setUnidades([]);
      setFormData((prev) => ({ ...prev, bloco_id: '', unidade_id: '' }));
      return;
    }

    Promise.all([
      fetch(`/api/condominios/${formData.condominio_id}/blocos`).then((res) => res.json()),
      fetch(`/api/condominios/${formData.condominio_id}/unidades`).then((res) => res.json()),
    ])
      .then(([blocosData, unidadesData]) => {
        if (Array.isArray(blocosData)) setBlocos(blocosData);
        else setBlocos([]);

        if (Array.isArray(unidadesData)) setUnidades(unidadesData);
        else setUnidades([]);
      })
      .catch(() => {
        setBlocos([]);
        setUnidades([]);
      });
  }, [formData.condominio_id]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, unidade_id: '' }));
  }, [formData.bloco_id]);

  // Redirect se já autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/home');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nome ||
      !formData.email ||
      !formData.password ||
      !formData.condominio_id ||
      !formData.bloco_id ||
      !formData.unidade_id ||
      !formData.cpf ||
      !formData.data_nascimento
    ) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Informe um CPF válido');
      return;
    }

    const birthDateIso = parseBirthDateToISO(formData.data_nascimento);
    if (!birthDateIso) {
      toast.error('Informe uma data de nascimento válida (DD/MM/AAAA)');
      return;
    }

    const pwResult = passwordSchema.safeParse(formData.password);
    if (!pwResult.success) {
      toast.error(pwResult.error.issues[0].message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não conferem');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os termos de uso');
      return;
    }

    setLoading(true);

    const result = await signup({
      nome: formData.nome,
      email: formData.email,
      password: formData.password,
      telefone: formData.telefone || undefined,
      condominio_id: formData.condominio_id,
      unidade_id: formData.unidade_id,
      cpf: formData.cpf,
      data_nascimento: birthDateIso,
      notificacoes_email: formData.notificacoes_email,
      notificacoes_push: formData.notificacoes_push,
      notificacoes_whatsapp: formData.notificacoes_whatsapp,
    });

    if (result.success) {
      toast.success('Conta criada! Verifique seu email para confirmar.');
      router.push('/login');
    } else {
      interface AuthError {
        message?: string;
      }

      const error = result.error as AuthError | null;
      const errorMessage = error?.message || 'Erro ao criar conta';

      if (errorMessage.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(errorMessage);
      }
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  };

  const formatBirthDate = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
  };

  const parseBirthDateToISO = (value: string): string | null => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, dayStr, monthStr, yearStr] = match;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
    if (year < 1900 || year > new Date().getFullYear()) return null;

    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!valid) return null;

    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  const blocoFallbackId = '__sem_bloco__';
  const blocosDisponiveis = useMemo(() => {
    const map = new Map<string, { id: string; nome: string }>();

    for (const bloco of blocos) {
      map.set(bloco.id, { id: bloco.id, nome: bloco.nome });
    }

    // Só usa fallback baseado em unidades quando não existem blocos oficiais configurados.
    if (blocos.length === 0) {
      for (const unidade of unidades) {
        const id = unidade.bloco_id || blocoFallbackId;
        if (!map.has(id)) {
          map.set(id, { id, nome: unidade.bloco_nome || 'Bloco Único' });
        }
      }
    }

    return Array.from(map.values());
  }, [blocos, unidades]);
  const unidadesFiltradas = formData.bloco_id
    ? unidades.filter((u) => (u.bloco_id || blocoFallbackId) === formData.bloco_id)
    : [];

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Building"
          className="h-full w-full object-cover brightness-[0.4] contrast-125 filter"
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
          fill
          priority
        />
        <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex h-full flex-col transition-all duration-700 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 pb-4">
          <div className="mb-6 mt-8 text-center">
            <h1 className="mb-2 font-display text-3xl font-bold tracking-widest text-white">
              NORMA
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Criar Conta</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="w-full max-w-sm space-y-3">
            {/* Nome */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">person</span>
              </div>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="Nome completo *"
                required
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">mail</span>
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="E-mail *"
                required
                disabled={loading}
              />
            </div>

            {/* Telefone */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">phone</span>
              </div>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({ ...formData, telefone: formatPhone(e.target.value) })
                }
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="Telefone (opcional)"
                disabled={loading}
              />
            </div>

            {/* CPF */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">badge</span>
              </div>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="CPF *"
                required
                disabled={loading}
              />
            </div>

            {/* Data de nascimento */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">
                  calendar_month
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={formData.data_nascimento}
                onChange={(e) =>
                  setFormData({ ...formData, data_nascimento: formatBirthDate(e.target.value) })
                }
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="Data de nascimento (DD/MM/AAAA) *"
                maxLength={10}
                required
                disabled={loading}
              />
            </div>

            {/* Condomínio */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">apartment</span>
              </div>
              <select
                value={formData.condominio_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    condominio_id: e.target.value,
                    bloco_id: '',
                    unidade_id: '',
                  })
                }
                className="w-full appearance-none rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary dark:bg-gray-800/95 dark:text-gray-200"
                required
                disabled={loading}
              >
                <option value="" disabled>
                  Selecione seu condomínio *
                </option>
                {condominios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="material-symbols-outlined text-lg text-gray-400">expand_more</span>
              </div>
            </div>

            {/* Bloco/Rua */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">home</span>
              </div>
              <select
                value={formData.bloco_id}
                onChange={(e) => setFormData({ ...formData, bloco_id: e.target.value })}
                className="w-full appearance-none rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary dark:bg-gray-800/95 dark:text-gray-200"
                required
                disabled={loading || !formData.condominio_id}
              >
                <option value="" disabled>
                  Selecione seu bloco/rua *
                </option>
                {blocosDisponiveis.map((bloco) => (
                  <option key={bloco.id} value={bloco.id}>
                    {bloco.nome}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="material-symbols-outlined text-lg text-gray-400">expand_more</span>
              </div>
            </div>

            {/* Unidade Habitacional */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">tag</span>
              </div>
              <select
                value={formData.unidade_id}
                onChange={(e) => setFormData({ ...formData, unidade_id: e.target.value })}
                className="w-full appearance-none rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary dark:bg-gray-800/95 dark:text-gray-200"
                required
                disabled={loading || !formData.condominio_id || !formData.bloco_id}
              >
                <option value="" disabled>
                  Selecione sua unidade (número) *
                </option>
                {unidadesFiltradas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.numero}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="material-symbols-outlined text-lg text-gray-400">expand_more</span>
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">lock</span>
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="Senha *"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            {formData.password && (
              <div className="grid grid-cols-2 gap-1 px-1">
                {PASSWORD_RULES.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    <span
                      className={`material-symbols-outlined text-xs ${rule.test(formData.password) ? 'text-green-400' : 'text-white/40'}`}
                    >
                      {rule.test(formData.password) ? 'check_circle' : 'circle'}
                    </span>
                    <span className={`text-[10px] ${rule.test(formData.password) ? 'text-green-300' : 'text-white/50'}`}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">lock</span>
              </div>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full rounded-xl border-none bg-white/95 py-3.5 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md focus:ring-2 focus:ring-secondary"
                placeholder="Confirmar senha *"
                required
                disabled={loading}
              />
            </div>

            {/* Terms */}
            <div className="space-y-2 rounded-xl bg-white/10 p-3">
              <p className="text-xs font-semibold text-blue-100">Notificações</p>
              <label className="flex items-center justify-between text-xs text-white">
                <span>Email</span>
                <input
                  type="checkbox"
                  checked={formData.notificacoes_email}
                  onChange={(e) =>
                    setFormData({ ...formData, notificacoes_email: e.target.checked })
                  }
                  disabled={loading}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-white">
                <span>Push</span>
                <input
                  type="checkbox"
                  checked={formData.notificacoes_push}
                  onChange={(e) =>
                    setFormData({ ...formData, notificacoes_push: e.target.checked })
                  }
                  disabled={loading}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-white">
                <span>WhatsApp</span>
                <input
                  type="checkbox"
                  checked={formData.notificacoes_whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, notificacoes_whatsapp: e.target.checked })
                  }
                  disabled={loading}
                />
              </label>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs leading-relaxed text-blue-100">
                Li e aceito os{' '}
                <span className="cursor-pointer font-bold text-white hover:underline">
                  Termos de Uso
                </span>{' '}
                e{' '}
                <span className="cursor-pointer font-bold text-white hover:underline">
                  Política de Privacidade
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-4 font-bold text-white shadow-lg transition-all hover:bg-secondary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Criando conta...
                </>
              ) : (
                <>
                  Criar Conta
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="rounded-t-[2.5rem] bg-white p-6 shadow-2xl dark:bg-card-dark">
          <p className="text-center text-sm text-text-sub">
            Já tem conta?{' '}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
