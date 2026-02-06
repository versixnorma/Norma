'use client';

import type { CondominioHealth } from '@/hooks/useAdminDashboard';
import Link from 'next/link';

interface CondominiosHealthProps {
  data: CondominioHealth[];
  loading?: boolean;
}

const STATUS_CONFIG = {
  healthy: {
    label: 'Saudável',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
  },
  warning: {
    label: 'Atenção',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  critical: {
    label: 'Crítico',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

export function CondominiosHealth({ data, loading }: CondominiosHealthProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse rounded-xl bg-gray-100 p-4 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-500">
        Nenhum condomínio encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((condo) => {
        const statusConfig = STATUS_CONFIG[condo.status];

        return (
          <Link
            key={condo.id}
            href={`/admin/condominios/${condo.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                <span className="font-medium text-gray-800 dark:text-white">{condo.nome}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {condo.usuarios_ativos} ativos / {condo.usuarios_total} total
                </span>
                <span>{condo.ocupacao_percent}% ocupação</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all ${
                    condo.status === 'healthy'
                      ? 'bg-green-500'
                      : condo.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${condo.ocupacao_percent}%` }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
