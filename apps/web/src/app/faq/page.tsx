'use client';

import { AuthGuard, useAuthContext } from '@/contexts/AuthContext';
import { useFAQ } from '@/hooks/useFAQ';
import { FAQItem } from '@/components/faq/FAQItem';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FAQPage() {
  const { profile } = useAuthContext();
  const { faqs, loading, fetchFAQs, voteUseful, getCategorias } = useFAQ();
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [busca, setBusca] = useState('');

  const condominioId = profile?.condominio_atual?.id;

  useEffect(() => {
    if (condominioId) {
      fetchFAQs(condominioId, { categoria: categoriaFilter || undefined, busca: busca || undefined });
      getCategorias(condominioId).then(setCategorias);
    }
  }, [condominioId, categoriaFilter, busca, fetchFAQs, getCategorias]);

  const handleVote = async (faqId: string, useful: boolean) => {
    await voteUseful(faqId, useful);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
        <header className="bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Link href="/home" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><span className="material-symbols-outlined">arrow_back</span></Link>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Perguntas Frequentes</h1>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar pergunta..." className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-gray-700 dark:text-white" />
            </div>
            {categorias.length > 0 && (
              <div className="flex gap-2 overflow-x-auto mt-4 pb-2 -mx-4 px-4">
                <button onClick={() => setCategoriaFilter('')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${!categoriaFilter ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>Todas</button>
                {categorias.map(cat => (
                  <button key={cat} onClick={() => setCategoriaFilter(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${categoriaFilter === cat ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>{cat}</button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-gray-400 mb-3">help_center</span>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                {busca ? 'Nenhum resultado' : 'Nenhuma pergunta cadastrada'}
              </h3>
              <p className="text-gray-500">{busca ? 'Tente outros termos de busca' : 'O síndico ainda não adicionou perguntas frequentes'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.filter(f => f.destaque).map(faq => <FAQItem key={faq.id} faq={faq} onVote={useful => handleVote(faq.id, useful)} />)}
              {faqs.filter(f => !f.destaque).map(faq => <FAQItem key={faq.id} faq={faq} onVote={useful => handleVote(faq.id, useful)} />)}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
