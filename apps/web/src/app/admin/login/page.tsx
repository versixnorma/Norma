'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading, profile } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Redirect se já autenticado com role admin
  useEffect(() => {
    if (isAuthenticated && !authLoading && profile) {
      const role = profile.role;
      const condoRole = profile.condominio_atual?.role;
      if (role === 'superadmin' || condoRole === 'admin_condo') {
        router.push('/admin/dashboard');
      } else {
        // Usuário sem permissão admin
        setLoading(false);
        setLoginError('Acesso restrito a administradores do sistema.');
        toast.error('Acesso restrito a administradores.');
      }
    }
  }, [isAuthenticated, authLoading, profile, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setLoginError(null);

    const result = await login({ email, password });

    if (result.success) {
      toast.success('Autenticação realizada!');
      // Redirect handled by useEffect when profile loads
      // Safety timeout: reset loading if profile never loads
      setTimeout(() => {
        setLoading(false);
      }, 5000);
    } else {
      interface AuthError {
        message?: string;
        status?: number;
        code?: string;
      }

      const error = result.error as AuthError | null;
      const errorMessage = error?.message || 'Erro ao autenticar';
      const errorCode = error?.status || error?.code;

      let userMessage = '';
      if (errorMessage.includes('Invalid login credentials')) {
        userMessage = 'Credenciais inválidas. Verifique e-mail e senha.';
      } else if (errorMessage.includes('Email not confirmed')) {
        userMessage = 'E-mail não confirmado.';
      } else if (errorMessage.includes('Too many requests')) {
        userMessage = 'Muitas tentativas. Aguarde alguns minutos.';
      } else if (errorCode === 400) {
        userMessage = 'Dados inválidos.';
      } else {
        userMessage = `Erro: ${errorMessage}`;
      }
      setLoginError(userMessage);
      toast.error(userMessage);
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div
        className={`hidden flex-col justify-between bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 p-12 transition-all duration-700 lg:flex lg:w-1/2 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <span className="material-symbols-outlined text-2xl text-indigo-400">shield</span>
            </div>
            <span className="text-lg font-semibold tracking-wide text-white">NORMA</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Painel
            <br />
            <span className="text-indigo-400">Administrativo</span>
          </h1>
          <p className="max-w-md text-lg text-gray-400">
            Gerencie condomínios, monitore métricas e controle operações em uma única plataforma.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 text-gray-300">
              <span className="material-symbols-outlined text-xl text-indigo-400">analytics</span>
              <span className="text-sm">Dashboard executivo com métricas em tempo real</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <span className="material-symbols-outlined text-xl text-indigo-400">smart_toy</span>
              <span className="text-sm">Gestão da IA Norma e base de conhecimento</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <span className="material-symbols-outlined text-xl text-indigo-400">description</span>
              <span className="text-sm">Relatórios avançados e exportação de dados</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-600">
          Versix Norma v1.0.5 &middot; Painel Administrativo
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div
        className={`flex w-full flex-col justify-center bg-gray-950 px-8 transition-all duration-700 lg:w-1/2 lg:px-16 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {/* Mobile header */}
        <div className="mb-8 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <span className="material-symbols-outlined text-2xl text-indigo-400">shield</span>
            </div>
            <div>
              <span className="text-lg font-semibold tracking-wide text-white">NORMA</span>
              <p className="text-xs text-gray-500">Painel Administrativo</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Acesso Administrativo</h2>
            <p className="mt-2 text-sm text-gray-500">
              Entre com suas credenciais de administrador
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
            aria-label="Formulário de login administrativo"
          >
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="text-xs font-medium uppercase tracking-wider text-gray-400"
              >
                E-mail
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-lg text-gray-600">mail</span>
                </div>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="admin@versixnorma.com.br"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="text-xs font-medium uppercase tracking-wider text-gray-400"
              >
                Senha
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-lg text-gray-600">lock</span>
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 py-3 pl-10 pr-10 text-sm text-white placeholder-gray-600 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Digite sua senha"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <span className="material-symbols-outlined text-lg text-gray-600 transition-colors hover:text-gray-400">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error message */}
            {loginError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/50 p-3 text-sm text-red-400">
                <span className="material-symbols-outlined text-lg">error</span>
                {loginError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Autenticando...
                </>
              ) : (
                <>
                  Acessar Painel
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Footer info */}
          <div className="mt-8 border-t border-gray-800/50 pt-6">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="material-symbols-outlined text-sm">info</span>
              <p>
                Acesso restrito a administradores do sistema. Contate o suporte caso precise de
                credenciais.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
