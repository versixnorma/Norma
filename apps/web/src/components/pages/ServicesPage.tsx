'use client';

import Image from 'next/image';

interface ServicesPageProps {
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'cleaning', label: 'Limpeza' },
  { id: 'maintenance', label: 'Manutenção' },
  { id: 'pet', label: 'Pet' },
  { id: 'food', label: 'Alimentação' },
];

const partners = [
  {
    id: 1,
    title: 'CleanFast Limpeza',
    desc: 'Limpeza pós-obra, vidros e fachadas. Atendimento 24h.',
    rating: 4.9,
    discount: '15% OFF',
    img: 'https://images.unsplash.com/photo-1581578731117-104f8a338e2d?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 2,
    title: 'FrioMax Ar Condicionado',
    desc: 'Instalação, manutenção e limpeza de splits e centrais.',
    rating: 4.8,
    discount: 'R$ 50 OFF',
    img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 3,
    title: 'DogHero Pet Walker',
    desc: 'Passeios, hospedagem e creche para seu pet.',
    rating: 5.0,
    discount: '1º Grátis',
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=200',
  },
];

export function ServicesPage({ onScroll }: ServicesPageProps) {
  return (
    <div
      className="flex-1 overflow-y-auto hide-scroll pb-32 pt-6 relative z-0 px-6 animate-slide-up space-y-6"
      onScroll={onScroll}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white font-display mb-1">
          Serviços
        </h2>
        <p className="text-sm text-text-sub">Parceiros exclusivos para moradores</p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">
          search
        </span>
        <input
          type="text"
          placeholder="Buscar serviços..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-700 text-sm focus:ring-2 focus:ring-secondary focus:border-transparent"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
              cat.id === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured Partners */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display mb-4">
          Parceiros em Destaque
        </h3>
        <div className="space-y-4">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white dark:bg-card-dark p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                <Image
                  src={partner.img}
                  alt={partner.title}
                  fill
                  width={0}
                  height={0}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">{partner.title}</h4>
                  <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">star</span>
                    {partner.rating}
                  </span>
                </div>
                <p className="text-xs text-text-sub mt-1 line-clamp-2 leading-relaxed">
                  {partner.desc}
                </p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-secondary bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                    {partner.discount}
                  </span>
                  <button className="text-xs font-bold text-primary hover:text-secondary transition-colors">
                    Ver Oferta
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggest Partner */}
      <div className="bg-gradient-to-r from-primary to-blue-800 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg">
        <div>
          <h4 className="font-bold text-sm mb-1">Indique um Parceiro</h4>
          <p className="text-[10px] text-blue-100 max-w-[150px]">
            Conhece um serviço top? Indique e ganhe descontos na taxa.
          </p>
        </div>
        <button className="bg-white text-primary text-xs font-bold py-2 px-4 rounded-lg shadow hover:bg-gray-100 transition-colors">
          Indicar
        </button>
      </div>
    </div>
  );
}
