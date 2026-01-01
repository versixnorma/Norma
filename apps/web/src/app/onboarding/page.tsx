'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const steps = [
  {
    icon: 'smart_toy',
    title: 'Conheça a Norma',
    desc: 'Sua assistente de IA que responde dúvidas sobre o regimento, reservas e muito mais.',
    color: 'text-secondary',
  },
  {
    icon: 'verified_user',
    title: 'Transparência Total',
    desc: 'Acompanhe as finanças do condomínio em tempo real com dashboards interativos.',
    color: 'text-accent-green',
  },
  {
    icon: 'groups',
    title: 'Comunidade Conectada',
    desc: 'Participe de assembleias híbridas, vote e interaja com vizinhos de forma segura.',
    color: 'text-accent-purple',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      router.push('/welcome');
    }
  };

  const handleSkip = () => {
    router.push('/home');
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative bg-gradient-to-br from-primary to-splash-primary font-sans">
      {/* Decorative elements */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[50%] bg-secondary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute top-[-10%] right-[-20%] w-[80%] h-[50%] bg-blue-500/20 rounded-full blur-3xl animate-float animation-delay-500" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        {/* Icon Container */}
        <div className="w-64 h-64 mb-8 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-white/10 rounded-full blur-xl animate-pulse-slow" />
          <div
            key={step}
            className="w-40 h-40 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/20 relative z-10 transition-all duration-500 animate-scale-in"
          >
            <span className={`material-symbols-outlined text-7xl ${steps[step].color}`}>
              {steps[step].icon}
            </span>
          </div>
        </div>

        {/* Text */}
        <div
          key={`text-${step}`}
          className="text-center max-w-xs mb-8 transition-opacity duration-500"
        >
          <h2 className="text-2xl font-display font-bold text-white mb-3 animate-slide-up">
            {steps[step].title}
          </h2>
          <p className="text-blue-100 text-sm leading-relaxed animate-slide-up animation-delay-100">
            {steps[step].desc}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex gap-2 mb-10">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-secondary' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white dark:bg-card-dark rounded-t-[2.5rem] p-8 shadow-2xl animate-slide-up">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl bg-primary text-white font-bold shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {step === steps.length - 1 ? 'Começar' : 'Próximo'}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
        <button
          onClick={handleSkip}
          className="w-full mt-4 text-xs font-bold text-text-sub uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Pular Introdução
        </button>
      </div>
    </div>
  );
}
