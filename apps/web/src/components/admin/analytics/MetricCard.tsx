'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}

export function MetricCard({ label, value, change, icon, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {change && (
        <p
          className={`mt-1 text-sm font-medium ${
            change.startsWith('+')
              ? 'text-green-600 dark:text-green-400'
              : change.startsWith('-')
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500'
          }`}
        >
          {change}
        </p>
      )}
    </div>
  );
}
