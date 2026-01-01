'use client';

import Image from 'next/image';
import { useRef } from 'react';

const items = [
  {
    id: 1,
    title: 'Limpeza Pós-Obra',
    discount: '15% OFF',
    image: 'https://images.unsplash.com/photo-1581578731117-104f8a338e2d?auto=format&fit=crop&q=80&w=400',
    color: 'from-blue-600 to-indigo-700',
    partner: 'CleanFast',
  },
  {
    id: 2,
    title: 'Pet Walker',
    discount: '1º Passeio Grátis',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=400',
    color: 'from-orange-500 to-red-500',
    partner: 'DogHero',
  },
  {
    id: 3,
    title: 'Manutenção Ar',
    discount: 'R$ 50 OFF',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=400',
    color: 'from-cyan-500 to-blue-600',
    partner: 'FrioMax',
  },
  {
    id: 4,
    title: 'Marmitas Fit',
    discount: 'Combo Semanal',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&q=80&w=400',
    color: 'from-green-500 to-emerald-600',
    partner: 'GreenFood',
  },
];

export function MarketplaceCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="px-0 animate-slide-up animation-delay-300">
      {/* Header */}
      <div className="flex justify-between items-end mb-3 px-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display">
            Clube de Vantagens
          </h3>
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            NOVO
          </span>
        </div>
        <button className="text-secondary text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wide">
          Ver todos
        </button>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scroll px-6 pb-4 snap-x snap-mandatory"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-64 h-32 relative rounded-xl overflow-hidden shadow-md group cursor-pointer snap-center transition-transform active:scale-95"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={item.image}
                alt={item.title}
                fill
                width={0}
                height={0}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-80 mix-blend-multiply`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between z-10 text-white">
              <div className="flex justify-between items-start">
                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-white/10">
                  {item.partner}
                </span>
                <div className="bg-white text-gray-900 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                  {item.discount}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight mb-1 drop-shadow-md">{item.title}</h4>
                <div className="flex items-center text-xs opacity-90 font-medium">
                  <span>Resgatar agora</span>
                  <span className="material-symbols-outlined text-sm ml-1 group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Business Card */}
        <div className="flex-shrink-0 w-24 h-32 relative rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors snap-center">
          <span className="material-symbols-outlined text-gray-400 text-2xl mb-1">add_business</span>
          <span className="text-[10px] font-bold text-gray-500 text-center px-2">
            Anuncie
            <br />
            Aqui
          </span>
        </div>
      </div>
    </div>
  );
}
