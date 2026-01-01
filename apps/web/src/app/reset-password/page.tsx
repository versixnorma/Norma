'use client';

import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Verificar se há uma sessão válida para reset de senha
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setValidSession(true);
      } else {
        toast.error('Link de recuperação inválido ou expirado');
        router.push('/login');
      }
    };

    checkSession();
  }, [supabase.auth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        toast.error('Erro ao atualizar senha. Tente novamente.');
      } else {
        toast.success('Senha atualizada com sucesso!');
        // Redirecionar para login após sucesso
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!validSession) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Building"
          className="w-full h-full object-cover filter brightness-[0.4] contrast-125"
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
          fill
          priority
        />
        <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col h-full transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-display font-bold text-white tracking-widest mb-2">
              NORMA
            </h1>
            <p className="text-blue-200 text-xs uppercase tracking-[0.2em]">
              Governança Assistida
            </p>
          </div>

          {/* Reset Password Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            {/* New Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-none text-gray-700 dark:text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg transition-all text-sm"
                placeholder="Nova senha"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <span className="material-symbols-outlined text-gray-400 hover:text-gray-600 text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-none text-gray-700 dark:text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg transition-all text-sm"
                placeholder="Confirme a nova senha"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <span className="material-symbols-outlined text-gray-400 hover:text-gray-600 text-xl">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-secondary text-white font-bold shadow-lg hover:bg-secondary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  Atualizar Senha
                  <span className="material-symbols-outlined text-sm">check</span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 max-w-sm">
            <p className="text-xs text-blue-200 text-center">
              Digite sua nova senha. Ela deve ter pelo menos 6 caracteres.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-card-dark rounded-t-[2.5rem] p-8 shadow-2xl">
          <p className="text-center text-sm text-text-sub">
            Lembrou sua senha?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
