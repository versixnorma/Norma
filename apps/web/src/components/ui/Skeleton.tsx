'use client';

export function SkeletonPulse() {
  return (
    <div className="px-6 animate-pulse space-y-4">
      <div className="w-full h-32 rounded-home-xl skeleton-bg" />
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="px-6 animate-pulse mt-6">
      <div className="flex justify-between mb-4">
        <div className="h-4 w-24 skeleton-bg rounded" />
        <div className="h-4 w-12 skeleton-bg rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 rounded-home-xl skeleton-bg" />
        <div className="h-32 rounded-home-xl skeleton-bg" />
        <div className="h-32 rounded-home-xl skeleton-bg" />
        <div className="h-32 rounded-home-xl skeleton-bg" />
      </div>
    </div>
  );
}
