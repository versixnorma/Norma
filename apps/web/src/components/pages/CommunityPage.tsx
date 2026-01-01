'use client';

interface CommunityPageProps {
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const events = [
  { id: 1, title: 'Assembleia Extraordinária', date: '20/12', time: '19:00', type: 'assembly', status: 'Confirmado' },
  { id: 2, title: 'Festa de Natal', date: '24/12', time: '18:00', type: 'social', status: 'Pendente' },
  { id: 3, title: 'Reunião do Conselho', date: '27/12', time: '20:00', type: 'meeting', status: 'Pendente' },
];

const reservations = [
  { id: 1, space: 'Salão de Festas', date: '28/12', time: '14:00 - 22:00', user: 'Apto 501' },
  { id: 2, space: 'Churrasqueira', date: '29/12', time: '12:00 - 18:00', user: 'Apto 302' },
];

export function CommunityPage({ onScroll }: CommunityPageProps) {
  return (
    <div
      className="flex-1 overflow-y-auto hide-scroll pb-32 pt-6 relative z-0 px-6 animate-slide-up space-y-6"
      onScroll={onScroll}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white font-display mb-1">
          Convivência
        </h2>
        <p className="text-sm text-text-sub">Eventos e reservas do condomínio</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="bg-primary text-white p-4 rounded-xl shadow-sm flex items-center gap-3 active:scale-95 transition">
          <span className="material-symbols-outlined text-2xl">event</span>
          <span className="text-sm font-bold">Nova Reserva</span>
        </button>
        <button className="bg-secondary text-white p-4 rounded-xl shadow-sm flex items-center gap-3 active:scale-95 transition">
          <span className="material-symbols-outlined text-2xl">report</span>
          <span className="text-sm font-bold">Ocorrência</span>
        </button>
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display mb-4">
          Próximos Eventos
        </h3>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-primary">{event.date.split('/')[0]}</span>
                <span className="text-[10px] text-primary/70 uppercase">Dez</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-800 dark:text-white">{event.title}</h4>
                <p className="text-xs text-text-sub mt-0.5">
                  {event.time} •{' '}
                  <span className={event.status === 'Confirmado' ? 'text-green-500' : 'text-orange-500'}>
                    {event.status}
                  </span>
                </p>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reservations */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display">
            Reservas da Semana
          </h3>
          <button className="text-secondary text-xs font-bold uppercase">Ver Calendário</button>
        </div>
        <div className="space-y-3">
          {reservations.map((res) => (
            <div
              key={res.id}
              className="bg-white dark:bg-card-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-sm text-gray-800 dark:text-white">{res.space}</h4>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">
                  {res.user}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-sub">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                {res.date}
                <span className="material-symbols-outlined text-sm ml-2">schedule</span>
                {res.time}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Rules */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-xl">info</span>
          <div>
            <h4 className="font-bold text-sm text-amber-800 dark:text-amber-200">
              Horário de Silêncio
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Lembre-se: O horário de silêncio é das 22h às 08h. Colabore com seus vizinhos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
