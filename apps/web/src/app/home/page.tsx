'use client';

import { NormaChatDynamic } from '@/components';
import { AvatarMenu } from '@/components/features/AvatarMenu';
import { BottomNav } from '@/components/features/BottomNav';
// FinancialPulse loaded dynamically
// MarketplaceCarousel loaded dynamically
// MuralDigital loaded dynamically
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
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';

const FinancialPulse = dynamic(
  () => import('@/components/features/FinancialPulse').then((mod) => mod.FinancialPulse),
  { loading: () => <SkeletonPulse /> }
);
const MarketplaceCarousel = dynamic(
  () => import('@/components/features/MarketplaceCarousel').then((mod) => mod.MarketplaceCarousel),
  {
    loading: () => (
      <div className="h-32 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
  }
);
const MuralDigital = dynamic(
  () => import('@/components/features/MuralDigital').then((mod) => mod.MuralDigital),
  {
    loading: () => (
      <div className="h-40 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
  }
);

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
    ? profile.nome
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
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
            className="hide-scroll relative z-0 flex-1 space-y-8 overflow-y-auto pb-32 pt-6"
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
    <div className="flex h-screen justify-center overflow-hidden bg-bg-light font-sans text-gray-800 dark:bg-bg-dark dark:text-gray-100">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl dark:bg-bg-dark">
        {/* Header */}
        <div
          className={`relative z-20 shrink-0 overflow-hidden rounded-b-[2.5rem] shadow-soft transition-all duration-500 ease-in-out ${
            isScrolled ? 'h-24 pb-0 pt-8' : 'h-64 pb-6 pt-12'
          }`}
        >
          {/* Background Image */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              alt="Background"
              className="h-full w-full object-cover brightness-[0.4] contrast-125 filter"
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
              fill
              priority
            />
            <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent opacity-90" />
          </div>

          {/* Header Content */}
          <div className="relative z-10 flex h-full flex-col px-6">
            {/* Top Bar */}
            <div className="relative flex h-12 shrink-0 items-center justify-between">
              <div className="transition-all duration-300">
                <SOSButton />
              </div>

              <h1
                className={`pointer-events-none absolute top-1/2 whitespace-nowrap font-display text-2xl font-bold tracking-widest text-white drop-shadow-md transition-all duration-500 ease-in-out ${
                  isScrolled
                    ? 'left-14 origin-left -translate-y-1/2 translate-x-0 scale-90'
                    : 'left-1/2 origin-center -translate-x-1/2 -translate-y-1/2 scale-100'
                }`}
              >
                NORMA
              </h1>

              {/* Right Icons */}
              <div className="relative z-10 flex items-center gap-3">
                <div
                  className={`relative cursor-pointer rounded-full p-2 backdrop-blur-sm transition-all hover:bg-white/20 ${
                    isScrolled ? 'block opacity-100' : 'hidden opacity-0'
                  }`}
                  onClick={() => setShowNormaChat(true)}
                >
                  <span className="material-symbols-outlined text-xl text-white">smart_toy</span>
                </div>

                <div
                  className="relative cursor-pointer rounded-full bg-white/10 p-2 backdrop-blur-sm transition-colors hover:bg-white/20"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="material-symbols-outlined text-xl text-white">
                    notifications
                  </span>
                  {naoLidos > 0 && (
                    <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-primary bg-red-500 text-[10px] font-bold text-white">
                      {naoLidos > 9 ? '9+' : naoLidos}
                    </span>
                  )}
                </div>

                <div
                  className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-secondary shadow-sm transition-colors hover:border-white/50"
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                >
                  <span className="text-sm font-bold text-white">{userInitials}</span>
                </div>
              </div>
            </div>

            {/* Welcome Section */}
            <div
              className={`flex flex-1 flex-col justify-center transition-all duration-300 ${
                isScrolled
                  ? 'pointer-events-none scale-95 opacity-0'
                  : 'scale-100 opacity-100 delay-100'
              }`}
            >
              <h2 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Olá, {userName}!
              </h2>
              <div className="ml-0.5 mt-1 flex items-center text-blue-200 opacity-90">
                <span className="material-symbols-outlined mr-1 text-sm">location_on</span>
                <p className="text-sm font-medium">{condominioNome}</p>
              </div>
              {/* Texto para Playwright: Bem-vindo */}
              <div className="mt-4 text-lg font-bold text-white" style={{ display: 'block' }}>
                Bem-vindo
              </div>
            </div>

            {/* Search Bar */}
            <div
              className={`relative mt-auto shrink-0 origin-bottom transition-all duration-500 ease-in-out ${
                isScrolled
                  ? 'mt-0 h-0 scale-y-0 overflow-hidden opacity-0'
                  : 'h-auto scale-y-100 opacity-100'
              }`}
            >
              <input
                className="w-full cursor-pointer rounded-xl border-none bg-white/95 py-3 pl-4 pr-12 text-sm text-gray-700 placeholder-gray-500 shadow-lg backdrop-blur-md transition-all focus:bg-white focus:ring-2 focus:ring-secondary dark:bg-gray-800/95 dark:text-gray-200 dark:placeholder-gray-400 dark:focus:bg-gray-800"
                placeholder="Pergunte à Norma sobre o regimento..."
                type="text"
                onClick={() => setShowNormaChat(true)}
                readOnly
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="material-symbols-outlined text-gray-400">smart_toy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        <AvatarMenu isOpen={showAvatarMenu} onClose={() => setShowAvatarMenu(false)} />
        <NormaChatDynamic isOpen={showNormaChat} onClose={() => setShowNormaChat(false)} />

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
