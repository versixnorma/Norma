'use client';

import type { ExecutiveAlert } from '@/lib/services/analyticsAlerts';

interface ExecutiveAlertsProps {
  alerts: ExecutiveAlert[];
  loading?: boolean;
}

const severityStyles: Record<ExecutiveAlert['severity'], { icon: string; classes: string }> = {
  critical: {
    icon: 'warning',
    classes:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
  high: {
    icon: 'error',
    classes:
      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
  },
  medium: {
    icon: 'notification_important',
    classes:
      'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  },
  low: {
    icon: 'info',
    classes: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
};

export function ExecutiveAlerts({ alerts, loading }: ExecutiveAlertsProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        Nenhum alerta critico no momento.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const style = severityStyles[alert.severity];
        return (
          <div key={alert.id} className={`rounded-lg border p-3 ${style.classes}`}>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base">{style.icon}</span>
              <div>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-0.5 text-xs opacity-90">{alert.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
