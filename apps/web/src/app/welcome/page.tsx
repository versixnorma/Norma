'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-primary relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          alt="Building"
          className="w-full h-full object-cover filter brightness-[0.4] contrast-125"
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
          fill
          priority
        />
        <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center animate-scale-in">
        {/* Avatar */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-pulse-slow">
            <span className="material-symbols-outlined text-5xl text-white">smart_toy</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-wide">
          NORMA
        </h1>

        {/* Welcome Message */}
        <h2 className="text-2xl font-light text-blue-100 mt-4">
          Seja Bem Vindo(a),
          <br />
          <span className="font-bold text-white">Igor!</span>
        </h2>

        {/* Loading indicator */}
        <div className="mt-8">
          <div className="flex justify-center gap-1">
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce animation-delay-100" />
            <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce animation-delay-200" />
          </div>
          <p className="text-xs text-blue-200 mt-3 uppercase tracking-wider">
            Preparando seu ambiente...
          </p>
        </div>
      </div>
    </div>
  );
}
