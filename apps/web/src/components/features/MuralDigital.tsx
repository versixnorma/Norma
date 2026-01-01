'use client';

export function MuralDigital() {
  return (
    <div className="px-6 animate-slide-up animation-delay-300">
      {/* Header */}
      <div className="flex justify-between items-end mb-3 px-1">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display">
          Mural Digital
        </h3>
        <span className="text-secondary text-xs font-bold cursor-pointer uppercase tracking-wide">
          Ver tudo
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {/* Maintenance Card */}
        <div className="bg-white dark:bg-card-dark p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-transform active:scale-[0.99] border-l-4 border-l-brand-danger">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-red-50 text-brand-danger px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                Manutenção
              </span>
            </div>
            <span className="text-xs text-text-sub">Hoje, 09:30</span>
          </div>
          <h4 className="font-bold text-gray-800 dark:text-white mb-2">
            Manutenção Elevador Social
          </h4>
          <p className="text-sm text-text-sub dark:text-gray-400 leading-relaxed mb-3">
            O elevador social do Bloco B estará em manutenção preventiva nesta quinta-feira das 14h às 16h.
          </p>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-text-sub text-xs">engineering</span>
            </div>
            <span className="text-xs text-text-sub font-medium">Síndico Geral</span>
          </div>
        </div>

        {/* Social Card */}
        <div className="bg-white dark:bg-card-dark p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-transform active:scale-[0.99]">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Social</span>
            </div>
            <span className="text-xs text-text-sub">Ontem</span>
          </div>
          <h4 className="font-bold text-gray-800 dark:text-white mb-2">Assembleia Extraordinária</h4>
          <p className="text-sm text-text-sub dark:text-gray-400 leading-relaxed mb-3">
            Convocação para aprovação do rateio da pintura. Dia 20/12 às 19h (Híbrida).
          </p>
          <div className="mt-2 flex gap-3">
            <button className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg shadow-sm hover:bg-primary/90 transition">
              Confirmar
            </button>
            <button className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition">
              Ler Pauta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
