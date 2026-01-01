'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, loading: authLoading } = useAuthContext();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Redirect se já autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/home');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
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

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-4 overflow-y-auto">
          <div className="text-center mb-6 mt-8">
            <h1 className="text-3xl font-display font-bold text-white tracking-widest mb-2">
              NORMA
            </h1>
            <p className="text-blue-200 text-xs uppercase tracking-[0.2em]">
              Criar Conta
            </p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="w-full max-w-sm space-y-3">
            {/* Nome */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
              </div>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/95 backdrop-blur-md border-none text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg text-sm"
                placeholder="Nome completo *"
                required
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">mail</span>
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/95 backdrop-blur-md border-none text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg text-sm"
                placeholder="E-mail *"
                required
                disabled={loading}
              />
            </div>

            {/* Telefone */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">phone</span>
              </div>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/95 backdrop-blur-md border-none text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg text-sm"
                placeholder="Telefone (opcional)"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/95 backdrop-blur-md border-none text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg text-sm"
                placeholder="Senha (mín. 6 caracteres) *"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
              </div>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/95 backdrop-blur-md border-none text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-secondary shadow-lg text-sm"
                placeholder="Confirmar senha *"
                required
                disabled={loading}
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs text-blue-100 leading-relaxed">
                Li e aceito os{' '}
                <span className="text-white font-bold hover:underline cursor-pointer">
                  Termos de Uso
                </span>{' '}
                e{' '}
                <span className="text-white font-bold hover:underline cursor-pointer">
                  Política de Privacidade
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full py-4 rounded-xl bg-secondary text-white font-bold shadow-lg hover:bg-secondary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        <div className="bg-white dark:bg-card-dark rounded-t-[2.5rem] p-6 shadow-2xl">
          <p className="text-center text-sm text-text-sub">
            Já tem conta?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
