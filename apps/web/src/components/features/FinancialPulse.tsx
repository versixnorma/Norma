'use client';

interface DashboardData {
  saldo_total: number;
  receitas_mes: number;
  despesas_mes: number;
  inadimplencia_percent: number;
  fundo_reserva: number;
}

interface FinancialPulseProps {
  dashboard: DashboardData | null;
}

export function FinancialPulse({ dashboard }: FinancialPulseProps) {
  const isHealthy = dashboard ? dashboard.inadimplencia_percent < 10 : true;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = () => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
  };

  return (
    <div className="px-6 animate-slide-up animation-delay-100">
      <div 
        className={`w-full bg-gradient-to-r ${
          isHealthy 
            ? 'from-accent-green/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 border-brand-success/20' 
            : 'from-orange-500/10 to-red-500/10 dark:from-orange-900/20 dark:to-red-900/20 border-orange-500/20'
        } rounded-home-xl shadow-sm border p-5 relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform`}
      >
        {/* Decorative */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 ${isHealthy ? 'bg-brand-success/10' : 'bg-orange-500/10'} rounded-full blur-2xl`} />

        <div className="flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex h-2 w-2 rounded-full ${isHealthy ? 'bg-brand-success shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isHealthy ? 'text-brand-success' : 'text-orange-500'}`}>
                Saúde Financeira
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight font-display">
              {isHealthy ? 'Contas em Dia' : 'Atenção Necessária'}
            </h3>
            <p className="text-xs text-text-sub dark:text-text-sub-dark mt-1">
              Última atualização:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {formatDate()}
              </span>
            </p>
          </div>
          <div className="text-right">
            <div className={`${isHealthy ? 'bg-white/50 dark:bg-white/10' : 'bg-orange-100 dark:bg-orange-900/20'} p-2 rounded-xl inline-flex items-center justify-center mb-1 backdrop-blur-sm shadow-sm`}>
              <span className={`material-symbols-outlined ${isHealthy ? 'text-brand-success' : 'text-orange-500'} text-2xl`}>
                {isHealthy ? 'verified_user' : 'warning'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {dashboard && (
          <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800 dark:text-white">
                {formatCurrency(dashboard.saldo_total)}
              </p>
              <p className="text-[10px] text-text-sub uppercase">Saldo</p>
            </div>
            <div className="text-center border-x border-gray-200/50 dark:border-gray-700/50">
              <p className="text-lg font-bold text-green-600">
                +{formatCurrency(dashboard.receitas_mes)}
              </p>
              <p className="text-[10px] text-text-sub uppercase">Receitas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">
                -{formatCurrency(dashboard.despesas_mes)}
              </p>
              <p className="text-[10px] text-text-sub uppercase">Despesas</p>
            </div>
          </div>
        )}

        <div className={`mt-4 flex items-center justify-between border-t ${isHealthy ? 'border-brand-success/10' : 'border-orange-500/10'} pt-3`}>
          <div className="flex items-center gap-1 text-xs text-text-sub dark:text-text-sub-dark">
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            Fundo Reserva: {dashboard ? formatCurrency(dashboard.fundo_reserva) : 'OK'}
          </div>
          <span className="text-secondary text-xs font-bold flex items-center group-hover:translate-x-1 transition-transform uppercase tracking-wide">
            Ver Balancete
            <span className="material-symbols-outlined text-sm ml-0.5">arrow_forward</span>
          </span>
        </div>
      </div>
    </div>
  );
}
