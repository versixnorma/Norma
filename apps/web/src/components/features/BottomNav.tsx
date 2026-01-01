'use client';

interface BottomNavProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

const navItems = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'transparency', icon: 'pie_chart', label: 'Transparência' },
  { id: 'community', icon: 'groups', label: 'Convivência' },
  { id: 'services', icon: 'storefront', label: 'Serviços' },
  { id: 'profile', icon: 'person', label: 'Meu Perfil' },
];

export function BottomNav({ activeNav, setActiveNav }: BottomNavProps) {
  return (
    <div className="absolute bottom-0 w-full z-30 bg-white dark:bg-card-dark pt-3 pb-5 px-4 shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
      <div className="flex justify-between items-end">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="flex flex-col items-center justify-end w-16 h-14 group relative"
              aria-label={`Ir para ${item.label}`}
              data-testid={`nav-${item.id}`}
            >
              <span
                className={`material-symbols-outlined text-[26px] transition-all duration-300 ease-out mb-0.5 ${
                  isActive
                    ? 'text-primary -translate-y-1'
                    : 'text-gray-300 group-hover:text-gray-400'
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[9px] font-semibold tracking-tight transition-all duration-300 ${
                  isActive
                    ? 'text-primary opacity-100 translate-y-0'
                    : 'text-gray-400 opacity-80'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
