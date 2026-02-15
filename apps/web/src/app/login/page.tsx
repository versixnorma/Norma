'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Redirect se já autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/home');
    }
  }, [isAuthenticated, authLoading, router]);

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
      toast.success('Login realizado com sucesso!');
      router.push('/home');
    } else {
      interface AuthError {
        message?: string;
        status?: number;
        code?: string;
      }

      const error = result.error as AuthError | null;
      const errorMessage = error?.message || 'Erro ao fazer login';
      const errorCode = error?.status || error?.code;

      let userMessage = '';
      if (errorMessage.includes('Invalid login credentials')) {
        userMessage =
          'Credenciais inválidas. Verifique email/senha ou entre em contato com o administrador para criar uma conta de teste.';
      } else if (errorMessage.includes('Email not confirmed')) {
        userMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
      } else if (errorMessage.includes('Too many requests')) {
        userMessage = 'Muitas tentativas. Tente novamente em alguns minutos.';
      } else if (errorMessage.includes('User not found')) {
        userMessage = 'Usuário não encontrado';
      } else if (errorCode === 400) {
        userMessage = 'Dados de login inválidos. Verifique email e senha.';
      } else {
        userMessage = `Erro ao fazer login: ${errorMessage}`;
      }
      setLoginError(userMessage);
      toast.error(userMessage);
      setLoading(false);
    }
  };

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
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-8">
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-4xl font-bold tracking-widest text-white">
              NORMA
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Governança Assistida</p>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm space-y-4"
            aria-label="Formulário de login"
          >
            {/* Email */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">mail</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border-none bg-white/95 py-4 pl-12 pr-4 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md transition-all focus:ring-2 focus:ring-secondary dark:bg-gray-800/95 dark:text-gray-200"
                placeholder="Digite seu e-mail"
                aria-label="E-mail"
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="material-symbols-outlined text-xl text-gray-400">lock</span>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-none bg-white/95 py-4 pl-12 pr-12 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md transition-all focus:ring-2 focus:ring-secondary dark:bg-gray-800/95 dark:text-gray-200"
                placeholder="Digite sua senha"
                aria-label="Senha"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <span className="material-symbols-outlined text-xl text-gray-400 transition-colors hover:text-gray-600">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-blue-200 transition-colors hover:text-white"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              aria-label="Entrar"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-4 font-bold text-white shadow-lg transition-all hover:bg-secondary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
            {loginError && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/20 p-3 text-sm text-white backdrop-blur-md">
                <span className="material-symbols-outlined text-lg text-red-300">error</span>
                {loginError}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="rounded-t-[2.5rem] bg-white p-8 shadow-2xl dark:bg-card-dark">
          <p className="text-center text-sm text-text-sub">
            Não tem conta?{' '}
            <Link href="/signup" className="font-bold text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
