'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SplashPage() {
  const router = useRouter();
  const [isClient] = useState(() => typeof window !== 'undefined');

  useEffect(() => {
    if (!isClient) return;

    const timer = setTimeout(() => {
      // Tenta router.push primeiro
      try {
        router.push('/login');
      } catch {
        // Fallback para window.location
        window.location.href = '/login';
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isClient, router]);

  return (
    <>
      {/* Meta refresh como fallback absoluto */}
      <meta httpEquiv="refresh" content="3;url=/login" />

      <div className="h-screen w-full flex flex-col overflow-hidden relative font-sans">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            alt="Building"
            className="w-full h-full object-cover filter brightness-[0.4] contrast-125"
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            fill
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent opacity-90" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full items-center justify-center">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl font-display font-bold text-white tracking-widest mb-2 animate-pulse">
              NORMA
            </h1>
            <p className="text-blue-200 text-xs uppercase tracking-[0.2em]">
              Governança Assistida
            </p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:100ms]" />
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:200ms]" />
          </div>
        </div>
      </div>
    </>
  );
}
