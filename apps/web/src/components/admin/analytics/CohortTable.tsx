'use client';

import type { CohortRow } from '@/lib/services/analyticsService';

interface CohortTableProps {
  data: CohortRow[];
  loading?: boolean;
}

function getHeatColor(rate: number): string {
  if (rate >= 80) return 'bg-blue-600 text-white';
  if (rate >= 60) return 'bg-blue-500 text-white';
  if (rate >= 40) return 'bg-blue-400 text-white';
  if (rate >= 20) return 'bg-blue-300 text-blue-900';
  if (rate > 0) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-600';
}

export function CohortTable({ data, loading }: CohortTableProps) {
  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-gray-500">
        Sem dados de cohort
      </div>
    );
  }

  const maxPeriods = Math.max(...data.map((r) => r.periods.length));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-gray-500 dark:border-gray-700">
            <th className="px-2 py-2 text-left">Cohort</th>
            <th className="px-2 py-2 text-center">Tamanho</th>
            {Array.from({ length: maxPeriods }, (_, i) => (
              <th key={i} className="px-2 py-2 text-center">
                Mês {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.cohort} className="border-b dark:border-gray-700">
              <td className="whitespace-nowrap px-2 py-1.5 font-medium text-gray-700 dark:text-gray-300">
                {row.cohort}
              </td>
              <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-400">
                {row.size}
              </td>
              {row.periods.map((p) => (
                <td key={p.period} className="px-1 py-1">
                  <div
                    className={`rounded px-2 py-1 text-center text-xs font-medium ${getHeatColor(p.rate)}`}
                  >
                    {p.rate}%
                  </div>
                </td>
              ))}
              {/* Fill empty cells */}
              {Array.from({ length: maxPeriods - row.periods.length }, (_, i) => (
                <td key={`empty-${i}`} className="px-1 py-1">
                  <div className="rounded bg-gray-50 px-2 py-1 text-center text-xs text-gray-300 dark:bg-gray-800">
                    -
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
