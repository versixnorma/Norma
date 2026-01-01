"use client";


export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="w-full py-4 bg-secondary text-white font-bold rounded-xl shadow-lg hover:bg-secondary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
    >
      <span className="material-symbols-outlined">refresh</span>
      Tentar novamente
    </button>
  );
}
