// =====================================================
// SPRINT 10: SystemStatus Component
// Indicador de status do sistema
// =====================================================

'use client';

import { getStatusColor, getStatusText, useSystemHealthStatus } from '@/hooks/useHealthCheck';
import { Activity, AlertTriangle, CheckCircle, Wifi, WifiOff, XCircle } from 'lucide-react';

// =====================================================
// MAIN COMPONENT
// =====================================================

export function SystemStatus() {
  const {
    status,
    isLoading,
    isOnline,
    networkLatency
  } = useSystemHealthStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Activity className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Verificando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status de conectividade */}
      <div className="flex items-center gap-1.5">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Status do sistema */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        <StatusIcon status={status} />
        <span>{getStatusText(status)}</span>
      </div>

      {/* Latência */}
      {networkLatency && (
        <span className="text-xs text-gray-500">
          {networkLatency}ms
        </span>
      )}
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${getStatusColor(status)}`}>
      <StatusIcon status={status} className={iconSizes[size]} />
      {showLabel && <span>{getStatusText(status)}</span>}
    </div>
  );
}

// =====================================================
// STATUS ICON
// =====================================================

interface StatusIconProps {
  status: string;
  className?: string;
}

function StatusIcon({ status, className = 'w-4 h-4' }: StatusIconProps) {
  switch (status) {
    case 'healthy':
    case 'ok':
      return <CheckCircle className={`${className} text-green-600`} />;
    case 'degraded':
      return <AlertTriangle className={`${className} text-yellow-600`} />;
    case 'unhealthy':
    case 'error':
      return <XCircle className={`${className} text-red-600`} />;
    default:
      return <Activity className={`${className} text-gray-400`} />;
  }
}

// =====================================================
// STATUS DOT (simples)
// =====================================================

interface StatusDotProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function StatusDot({ status, size = 'md', pulse = false }: StatusDotProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    healthy: 'bg-green-500',
    ok: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500',
    error: 'bg-red-500',
    offline: 'bg-gray-400',
  }[status] || 'bg-gray-400';

  return (
    <span className="relative inline-flex">
      <span className={`${sizeClasses[size]} ${colorClasses} rounded-full`} />
      {pulse && (
        <span className={`absolute inset-0 ${sizeClasses[size]} ${colorClasses} rounded-full animate-ping opacity-75`} />
      )}
    </span>
  );
}

// =====================================================
// HEALTH SUMMARY
// =====================================================

interface HealthSummaryProps {
  ok: number;
  degraded: number;
  error: number;
}

export function HealthSummary({ ok, degraded, error }: HealthSummaryProps) {
  const total = ok + degraded + error;

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <StatusDot status="ok" size="sm" />
        <span className="text-gray-600">{ok}/{total} OK</span>
      </div>

      {degraded > 0 && (
        <div className="flex items-center gap-1.5">
          <StatusDot status="degraded" size="sm" />
          <span className="text-yellow-600">{degraded} degradado</span>
        </div>
      )}

      {error > 0 && (
        <div className="flex items-center gap-1.5">
          <StatusDot status="error" size="sm" pulse />
          <span className="text-red-600">{error} com erro</span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// UPTIME BAR
// =====================================================

interface UptimeBarProps {
  percentage: number;
  label?: string;
}

export function UptimeBar({ percentage, label }: UptimeBarProps) {
  const getColor = () => {
    if (percentage >= 99.9) return 'bg-green-500';
    if (percentage >= 99) return 'bg-green-400';
    if (percentage >= 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm font-medium">{percentage.toFixed(2)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// =====================================================
// LATENCY INDICATOR
// =====================================================

interface LatencyIndicatorProps {
  latency: number;
  threshold?: { good: number; warning: number };
}

export function LatencyIndicator({
  latency,
  threshold = { good: 200, warning: 500 }
}: LatencyIndicatorProps) {
  const getStatus = () => {
    if (latency <= threshold.good) return 'good';
    if (latency <= threshold.warning) return 'warning';
    return 'slow';
  };

  const status = getStatus();

  const colors = {
    good: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    slow: 'text-red-600 bg-red-100',
  };

  const labels = {
    good: 'Rápido',
    warning: 'Moderado',
    slow: 'Lento',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
      <span>{latency}ms</span>
      <span className="opacity-75">({labels[status]})</span>
    </div>
  );
}

export default SystemStatus;
