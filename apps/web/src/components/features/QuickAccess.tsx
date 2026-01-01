'use client';

import { useRouter } from 'next/navigation';

const quickItems = [
  {
    id: 'assemblies',
    icon: 'groups',
    title: 'Assembleias',
    desc: 'Participe e Vote',
    badge: '1 aberta',
    bgColor: 'bg-blue-50/80 dark:bg-card-dark',
    borderColor: 'border-blue-100 dark:border-gray-700',
    iconBg: 'bg-white dark:bg-blue-900/30',
    iconColor: 'text-blue-500',
    badgeColor: 'bg-blue-100 text-blue-600',
    decorColor: 'bg-blue-200/20',
  },
  {
    id: 'comunicados',
    icon: 'campaign',
    title: 'Comunicados',
    desc: 'Avisos Oficiais',
    badge: '100% lido',
    bgColor: 'bg-accent-orange/10 dark:bg-card-dark',
    borderColor: 'border-orange-100 dark:border-gray-700',
    iconBg: 'bg-white dark:bg-orange-900/30',
    iconColor: 'text-accent-orange',
    badgeColor: 'bg-orange-100 text-orange-600',
    decorColor: 'bg-accent-orange/20',
  },
  {
    id: 'faqs',
    icon: 'quiz',
    title: 'FAQs',
    desc: 'Tire suas Dúvidas',
    badge: '01 novo',
    bgColor: 'bg-accent-green/10 dark:bg-card-dark',
    borderColor: 'border-green-100 dark:border-gray-700',
    iconBg: 'bg-white dark:bg-green-900/30',
    iconColor: 'text-accent-green',
    badgeColor: 'bg-green-100 text-green-600',
    decorColor: 'bg-accent-green/20',
  },
  {
    id: 'chamados',
    icon: 'support_agent',
    title: 'Chamados',
    desc: 'Solicitações',
    badge: '2 pendentes',
    bgColor: 'bg-purple-50/80 dark:bg-card-dark',
    borderColor: 'border-purple-100 dark:border-gray-700',
    iconBg: 'bg-white dark:bg-purple-900/30',
    iconColor: 'text-purple-500',
    badgeColor: 'bg-purple-100 text-purple-600',
    decorColor: 'bg-purple-200/20',
  },
  {
    id: 'ocorrencias',
    icon: 'report_problem',
    title: 'Ocorrências',
    desc: 'Reportar Problemas',
    badge: 'novo',
    bgColor: 'bg-red-50/80 dark:bg-card-dark',
    borderColor: 'border-red-100 dark:border-gray-700',
    iconBg: 'bg-white dark:bg-red-900/30',
    iconColor: 'text-red-500',
    badgeColor: 'bg-red-100 text-red-600',
    decorColor: 'bg-red-200/20',
  },
  {
    id: 'bibliotecas',
    icon: 'library_books',
    title: 'Bibliotecas',
    desc: 'Documentos e Atas',
    badge: 'novo doc',
    bgColor: 'bg-accent-purple/10 dark:bg-card-dark',
    borderColor: 'border-purple-100 dark:border-gray-700',
    iconBg: 'bg-white dark:bg-purple-900/30',
    iconColor: 'text-accent-purple',
    badgeColor: 'bg-purple-100 text-purple-600',
    decorColor: 'bg-accent-purple/20',
  },
];

export function QuickAccess() {
  const router = useRouter();

  const handleItemClick = (itemId: string) => {
    switch (itemId) {
      case 'assemblies':
        router.push('/assembleias');
        break;
      case 'comunicados':
        router.push('/comunicados');
        break;
      case 'faqs':
        router.push('/faq');
        break;
      case 'chamados':
        router.push('/chamados');
        break;
      case 'ocorrencias':
        router.push('/ocorrencias');
        break;
      case 'bibliotecas':
        // TODO: Implementar página de bibliotecas/documentos
        router.push('/assembleias'); // Temporário - redirecionar para assembleias
        break;
      default:
        break;
    }
  };
  return (
    <div className="px-6 animate-slide-up animation-delay-200">
      <div className="flex justify-between items-end mb-4 px-1">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display">
          Acesso Rápido
        </h3>
        <button className="text-secondary text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide">
          Editar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {quickItems.slice(0, 4).map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`${item.bgColor} p-4 rounded-home-xl shadow-sm border ${item.borderColor} relative overflow-hidden group cursor-pointer active:scale-95 transition-all duration-200 h-32 flex flex-col justify-center gap-2`}
            aria-label={`Acesso rápido: ${item.title}`}
            data-testid={`quickaccess-${item.id}`}
          >
            {/* Decorative corner */}
            <div
              className={`absolute top-0 right-0 w-16 h-16 ${item.decorColor} rounded-bl-[3rem] -mr-2 -mt-2 transition-transform group-hover:scale-110`}
            />

            <div className="flex items-center gap-3 relative z-10">
              <div
                className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor} shadow-sm`}
              >
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-white">{item.title}</h4>
            </div>

            <p className="text-xs text-text-sub dark:text-text-sub-dark pl-1 relative z-10">
              {item.desc}
            </p>

            {/* Badge */}
            <div className="absolute bottom-2 right-2">
              <span className={`${item.badgeColor} text-[9px] font-bold px-1.5 py-0.5 rounded-md`}>
                {item.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Segunda linha com Chamados e Ocorrências */}
      <div className="grid grid-cols-2 gap-4">
        {quickItems.slice(4, 6).map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`${item.bgColor} p-4 rounded-home-xl shadow-sm border ${item.borderColor} relative overflow-hidden group cursor-pointer active:scale-95 transition-all duration-200 h-32 flex flex-col justify-center gap-2`}
            aria-label={`Acesso rápido: ${item.title}`}
            data-testid={`quickaccess-${item.id}`}
          >
            {/* Decorative corner */}
            <div
              className={`absolute top-0 right-0 w-16 h-16 ${item.decorColor} rounded-bl-[3rem] -mr-2 -mt-2 transition-transform group-hover:scale-110`}
            />

            <div className="flex items-center gap-3 relative z-10">
              <div
                className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor} shadow-sm`}
              >
                <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              </div>
              <h4 className="font-bold text-gray-800 dark:text-white">{item.title}</h4>
            </div>

            <p className="text-xs text-text-sub dark:text-text-sub-dark pl-1 relative z-10">
              {item.desc}
            </p>

            {/* Badge */}
            <div className="absolute bottom-2 right-2">
              <span className={`${item.badgeColor} text-[9px] font-bold px-1.5 py-0.5 rounded-md`}>
                {item.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
