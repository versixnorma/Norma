'use client';

import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Digite seu e-mail');
      return;
    }

    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Digite um e-mail válido');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Erro ao enviar e-mail de recuperação:', error);
        toast.error('Erro ao enviar e-mail. Tente novamente.');
      } else {
        setSent(true);
        toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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

            {/* Success Message */}
            <div className="w-full max-w-sm bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl p-6 shadow-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">
                    check_circle
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  E-mail enviado!
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-secondary text-white font-bold shadow-lg hover:bg-secondary/90 active:scale-[0.98] transition-all inline-block text-center"
                >
                  Voltar ao Login
                </Link>
              </div>
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

          {/* Forgot Password Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">mail</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-none text-gray-700 dark:text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg transition-all text-sm"
                placeholder="Digite seu e-mail"
                required
                disabled={loading}
              />
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
                  Enviando...
                </>
              ) : (
                <>
                  Enviar Link de Recuperação
                  <span className="material-symbols-outlined text-sm">send</span>
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 max-w-sm">
            <p className="text-xs text-blue-200 text-center">
              Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
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
