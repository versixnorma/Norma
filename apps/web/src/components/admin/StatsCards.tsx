'use client';

import type { AdminStats } from '@/hooks/useAdmin';

interface StatsCardsProps {
  stats: AdminStats | null;
  loading?: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    { title: 'Condomínios', value: stats?.total_condominios || 0, icon: 'apartment', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { title: 'Usuários Ativos', value: stats?.usuarios_ativos || 0, icon: 'group', color: 'bg-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { title: 'Pendentes', value: stats?.usuarios_pendentes || 0, icon: 'pending', color: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', alert: (stats?.usuarios_pendentes || 0) > 0 },
    { title: 'Total Unidades', value: stats?.total_unidades || 0, icon: 'home', color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (<div key={i} className="bg-white dark:bg-card-dark rounded-2xl p-6 animate-pulse"><div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" /><div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" /><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" /></div>))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className={`${card.bgColor} rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 relative overflow-hidden group hover:shadow-lg transition-shadow`}>
          {card.alert && (<div className="absolute top-3 right-3"><span className="flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" /></span></div>)}
          <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg`}><span className="material-symbols-outlined text-white text-2xl">{card.icon}</span></div>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{card.value.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{card.title}</p>
          <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.color} opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500`} />
        </div>
      ))}
    </div>
  );
}
