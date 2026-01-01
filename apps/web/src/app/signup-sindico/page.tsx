'use client';
import { useAuthContext } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SignupSindicoPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const supabase = getSupabaseClient();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', cpf: '', password: '', confirmPassword: '', condominioNome: '', condominioEndereco: '', condominioCidade: '', condominioEstado: 'CE', mandatoInicio: '', mandatoFim: '' });
  const [ataFile, setAtaFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);
  useEffect(() => { if (isAuthenticated && !authLoading) router.push('/home'); }, [isAuthenticated, authLoading, router]);

  const formatCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14);
  const formatPhone = (v: string) => { const n = v.replace(/\D/g, ''); return n.length <= 11 ? n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : v; };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; } if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { toast.error('Use PDF, JPG ou PNG'); return; } setAtaFile(file); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(step + 1); return; }
    if (!ataFile) { toast.error('Envie a ata'); return; }
    if (!acceptedTerms) { toast.error('Aceite os termos'); return; }
    if (formData.password !== formData.confirmPassword) { toast.error('Senhas não conferem'); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password, options: { data: { nome: formData.nome, telefone: formData.telefone, cpf: formData.cpf, is_sindico: true } } });
      if (authError) throw authError;
      const fileName = `${authData.user?.id}/${Date.now()}_ata.${ataFile.name.split('.').pop()}`;
      await supabase.storage.from('atas-eleicao').upload(fileName, ataFile);
      toast.success('Cadastro enviado!');
      router.push('/aguardando-validacao-ata');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro';
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-primary"><div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen w-full flex flex-col relative font-sans">
      <div className="absolute inset-0 z-0"><Image alt="Building" className="w-full h-full object-cover brightness-[0.4]" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070" fill priority /><div className="absolute inset-0 bg-primary/80 mix-blend-multiply" /></div>
      <div className={`relative z-10 flex flex-col h-full transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
          <div className="text-center mb-6"><h1 className="text-2xl font-bold text-white tracking-widest mb-2">NORMA</h1><p className="text-blue-200 text-xs uppercase tracking-[0.2em]">Cadastro de Síndico</p></div>
          <div className="flex items-center gap-2 mb-6">{[1, 2, 3].map((s) => <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? 'bg-secondary' : 'bg-white/30'}`} />)}</div>
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
            {step === 1 && <><p className="text-white text-sm mb-4 text-center">Dados Pessoais</p><input type="text" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Nome completo *" required /><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="E-mail *" required /><input type="tel" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Telefone *" required /><input type="text" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="CPF *" required /><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Senha *" required minLength={6} /><input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Confirmar senha *" required /></>}
            {step === 2 && <><p className="text-white text-sm mb-4 text-center">Dados do Condomínio</p><input type="text" value={formData.condominioNome} onChange={(e) => setFormData({ ...formData, condominioNome: e.target.value })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Nome do Condomínio *" required /><input type="text" value={formData.condominioEndereco} onChange={(e) => setFormData({ ...formData, condominioEndereco: e.target.value })} className="w-full px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Endereço *" required /><div className="flex gap-3"><input type="text" value={formData.condominioCidade} onChange={(e) => setFormData({ ...formData, condominioCidade: e.target.value })} className="flex-1 px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" placeholder="Cidade *" required /><select value={formData.condominioEstado} onChange={(e) => setFormData({ ...formData, condominioEstado: e.target.value })} className="w-24 px-3 py-3.5 rounded-xl bg-white/95 text-gray-700"><option value="CE">CE</option><option value="SP">SP</option><option value="RJ">RJ</option></select></div><p className="text-blue-200 text-xs">Período do mandato:</p><div className="flex gap-3"><input type="date" value={formData.mandatoInicio} onChange={(e) => setFormData({ ...formData, mandatoInicio: e.target.value })} className="flex-1 px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" required /><input type="date" value={formData.mandatoFim} onChange={(e) => setFormData({ ...formData, mandatoFim: e.target.value })} className="flex-1 px-4 py-3.5 rounded-xl bg-white/95 text-gray-700" required /></div></>}
            {step === 3 && <><p className="text-white text-sm mb-4 text-center">Ata de Eleição</p><div className="bg-white/10 rounded-xl p-4 mb-4"><p className="text-blue-200 text-xs mb-3">Envie a ata que comprova seu mandato (PDF, JPG ou PNG, máx 5MB)</p><label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/30 rounded-xl cursor-pointer hover:border-white/50"><input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />{ataFile ? <><span className="material-symbols-outlined text-green-400 text-3xl mb-2">check_circle</span><p className="text-white text-sm">{ataFile.name}</p></> : <><span className="material-symbols-outlined text-white/50 text-3xl mb-2">upload_file</span><p className="text-white/70 text-sm">Clique para enviar</p></>}</label></div><label className="flex items-start gap-3"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 w-4 h-4 rounded" /><span className="text-xs text-blue-100">Li e aceito os Termos de Uso e Política de Privacidade</span></label></>}
            <div className="flex gap-3 pt-4">{step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 py-4 rounded-xl bg-white/20 text-white font-bold">Voltar</button>}<button type="submit" disabled={loading} className="flex-1 py-4 rounded-xl bg-secondary text-white font-bold disabled:opacity-50">{loading ? 'Enviando...' : step === 3 ? 'Enviar Cadastro' : 'Continuar'}</button></div>
          </form>
        </div>
        <div className="bg-white dark:bg-card-dark rounded-t-[2.5rem] p-6 shadow-2xl"><p className="text-center text-sm text-text-sub">Já tem conta? <Link href="/login" className="text-primary font-bold">Entrar</Link></p></div>
      </div>
    </div>
  );
}
