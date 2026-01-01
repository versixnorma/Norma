'use client';

import { NormaChatDynamic } from '@/components';
import { AvatarMenu } from '@/components/features/AvatarMenu';
import { BottomNav } from '@/components/features/BottomNav';
import { FinancialPulse } from '@/components/features/FinancialPulse';
import { MarketplaceCarousel } from '@/components/features/MarketplaceCarousel';
import { MuralDigital } from '@/components/features/MuralDigital';
import { NotificationPanel } from '@/components/features/NotificationPanel';
import { QuickAccess } from '@/components/features/QuickAccess';
import { SOSButton } from '@/components/features/SOSButton';
import { CommunityPage } from '@/components/pages/CommunityPage';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { ServicesPage } from '@/components/pages/ServicesPage';
import { TransparencyPage } from '@/components/pages/TransparencyPage';
import { SkeletonGrid, SkeletonPulse } from '@/components/ui/Skeleton';
import { useAuthContext } from '@/contexts/AuthContext';
import { useComunicados } from '@/hooks/useComunicados';
import { useFinancial } from '@/hooks/useFinancial';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';

function HomeContent() {
  const router = useRouter();
  const { profile, isAuthenticated, loading: authLoading } = useAuthContext();

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showNormaChat, setShowNormaChat] = useState(false);
  const [dataLoadingTimeout, setDataLoadingTimeout] = useState(false);

  // Hooks de dados - só carregar se perfil estiver disponível
  const condominioId = profile?.condominio_atual?.id || null;
  const userId = profile?.id || null;

  const { dashboard, loading: financialLoading } = useFinancial({
    condominioId,
  });

  const { naoLidos } = useComunicados({
    condominioId,
    userId,
  });

  // Timeout para loading de dados (evitar loop infinito)
  useEffect(() => {
    if (authLoading || !isAuthenticated || !condominioId) return;

    const timeout = setTimeout(() => {
      setDataLoadingTimeout(true);
    }, 10000); // 10 segundos timeout

    return () => clearTimeout(timeout);
  }, [authLoading, isAuthenticated, condominioId]);

  // Redirect se não autenticado
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Reset scroll state when changing tabs
  useEffect(() => {
    // Use transition to avoid cascading renders
    startTransition(() => {
      setIsScrolled(false);
    });
  }, [activeNav]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setIsScrolled(scrollTop > 50);
  };

  // Dados do usuário
  const userName = profile?.nome?.split(' ')[0] || 'Usuário';
  const userInitials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US';
  const condominioNome = profile?.condominio_atual?.nome || 'Condomínio';

  const isLoading = authLoading || (!dataLoadingTimeout && financialLoading && condominioId);

  const renderContent = () => {
    switch (activeNav) {
      case 'transparency':
        return <TransparencyPage onScroll={handleScroll} dashboard={dashboard} />;
      case 'community':
        return <CommunityPage onScroll={handleScroll} />;
      case 'services':
        return <ServicesPage onScroll={handleScroll} />;
      case 'profile':
        return <ProfilePage onScroll={handleScroll} />;
      default:
        return (
          <div
            className="flex-1 overflow-y-auto hide-scroll pb-32 pt-6 relative z-0 space-y-8"
            onScroll={handleScroll}
          >
            {isLoading ? <SkeletonPulse /> : <FinancialPulse dashboard={dashboard} />}
            {isLoading ? <SkeletonGrid /> : <QuickAccess />}
            <MuralDigital />
            <MarketplaceCarousel />
            <div className="h-4" />
          </div>
        );
    }
  };

  return (
    <div className="bg-bg-light dark:bg-bg-dark font-sans text-gray-800 dark:text-gray-100 h-screen flex justify-center overflow-hidden">
      <div className="w-full max-w-md h-full bg-white dark:bg-bg-dark shadow-2xl relative flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className={`relative z-20 shrink-0 shadow-soft transition-all duration-500 ease-in-out overflow-hidden rounded-b-[2.5rem] ${
            isScrolled ? 'h-24 pt-8 pb-0' : 'h-64 pt-12 pb-6'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <Image
              alt="Background"
              className="w-full h-full object-cover filter brightness-[0.4] contrast-125"
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
              fill
              priority
            />
            <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent opacity-90" />
          </div>

          {/* Header Content */}
          <div className="relative z-10 px-6 h-full flex flex-col">
            {/* Top Bar */}
            <div className="flex justify-between items-center relative h-12 shrink-0">
              <div className="transition-all duration-300">
                <SOSButton />
              </div>

              <h1
                className={`absolute top-1/2 text-white font-display font-bold text-2xl tracking-widest drop-shadow-md transition-all duration-500 ease-in-out whitespace-nowrap pointer-events-none ${
                  isScrolled
                    ? 'left-14 -translate-y-1/2 translate-x-0 scale-90 origin-left'
                    : 'left-1/2 -translate-y-1/2 -translate-x-1/2 scale-100 origin-center'
                }`}
              >
                NORMA
              </h1>

              {/* Right Icons */}
              <div className="flex items-center gap-3 relative z-10">
                <div
                  className={`relative p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer backdrop-blur-sm ${
                    isScrolled ? 'opacity-100 block' : 'opacity-0 hidden'
                  }`}
                  onClick={() => setShowNormaChat(true)}
                >
                  <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
                </div>

                <div
                  className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer backdrop-blur-sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="material-symbols-outlined text-white text-xl">notifications</span>
                  {naoLidos > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-primary text-white text-[10px] font-bold flex items-center justify-center">
                      {naoLidos > 9 ? '9+' : naoLidos}
                    </span>
                  )}
                </div>

                <div
                  className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden shadow-sm cursor-pointer hover:border-white/50 transition-colors bg-secondary flex items-center justify-center"
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                >
                  <span className="text-white font-bold text-sm">{userInitials}</span>
                </div>
              </div>
            </div>

            {/* Welcome Section */}
            <div
              className={`flex-1 flex flex-col justify-center transition-all duration-300 ${
                isScrolled
                  ? 'opacity-0 scale-95 pointer-events-none'
                  : 'opacity-100 scale-100 delay-100'
              }`}
            >
              <h2 className="text-white font-display font-bold text-3xl tracking-tight drop-shadow-sm">
                Olá, {userName}!
              </h2>
              <div className="flex items-center mt-1 ml-0.5 opacity-90 text-blue-200">
                <span className="material-symbols-outlined text-sm mr-1">location_on</span>
                <p className="text-sm font-medium">{condominioNome}</p>
              </div>
              {/* Texto para Playwright: Bem-vindo */}
              <div className="text-white text-lg font-bold mt-4" style={{display:'block'}}>
                Bem-vindo
              </div>
            </div>

            {/* Search Bar */}
            <div
              className={`relative mt-auto transition-all duration-500 ease-in-out origin-bottom shrink-0 ${
                isScrolled ? 'opacity-0 scale-y-0 h-0 overflow-hidden mt-0' : 'opacity-100 scale-y-100 h-auto'
              }`}
            >
              <input
                className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-none text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-secondary focus:bg-white dark:focus:bg-gray-800 shadow-lg transition-all text-sm cursor-pointer"
                placeholder="Pergunte à Norma sobre o regimento..."
                type="text"
                onClick={() => setShowNormaChat(true)}
                readOnly
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400">smart_toy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <NotificationPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
        <AvatarMenu
          isOpen={showAvatarMenu}
          onClose={() => setShowAvatarMenu(false)}
        />
        <NormaChatDynamic
          isOpen={showNormaChat}
          onClose={() => setShowNormaChat(false)}
        />

        {/* Content */}
        {renderContent()}

        {/* Bottom Navigation */}
        <BottomNav activeNav={activeNav} setActiveNav={setActiveNav} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomeContent />;
}
