// =====================================================
// SPRINT 10: MetricasCards Component
// Cards de métricas para dashboard de observabilidade
// =====================================================

'use client';

import type { DashboardObservabilidade } from '@/types/observabilidade';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';

// =====================================================
// MAIN COMPONENT
// =====================================================

interface MetricasCardsProps {
  data: DashboardObservabilidade;
}

export function MetricasCards({ data }: MetricasCardsProps) {
  const { metricas, performance, uptime, custos } = data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Usuários Ativos */}
      <MetricaCard
        icon={Users}
        label="Usuários Ativos"
        value={metricas.hoje.total_usuarios_ativos}
        color="indigo"
      />

      {/* Requisições */}
      <MetricaCard
        icon={Activity}
        label="Requisições/h"
        value={performance.rps * 3600}
        format="compact"
        color="blue"
      />

      {/* Taxa de Erro */}
      <MetricaCard
        icon={performance.taxa_erro > 1 ? AlertTriangle : CheckCircle}
        label="Taxa de Erro"
        value={performance.taxa_erro}
        suffix="%"
        color={performance.taxa_erro > 1 ? 'red' : 'green'}
      />

      {/* Latência */}
      <MetricaCard
        icon={Clock}
        label="Latência (p99)"
        value={performance.latencia_p99}
        suffix="ms"
        color={performance.latencia_p99 > 500 ? 'yellow' : 'green'}
      />

      {/* Uptime */}
      <MetricaCard
        icon={Zap}
        label="Uptime 24h"
        value={uptime.percentual_24h}
        suffix="%"
        color={uptime.percentual_24h >= 99.9 ? 'green' : 'yellow'}
      />

      {/* Condôminos */}
      <MetricaCard
        icon={Users}
        label="Condôminos Ativos"
        value={metricas.hoje.total_condominios_ativos}
        color="purple"
      />

      {/* Custo Hoje */}
      <MetricaCard
        icon={DollarSign}
        label="Custo Hoje"
        value={custos.hoje / 100}
        prefix="R$"
        format="currency"
        color="emerald"
      />

      {/* Custo Mês */}
      <MetricaCard
        icon={DollarSign}
        label="Custo Mês"
        value={custos.mes / 100}
        prefix="R$"
        format="currency"
        color="emerald"
      />
    </div>
  );
}

// =====================================================
// METRICA CARD
// =====================================================

interface MetricaCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  format?: 'number' | 'compact' | 'currency' | 'percent';
  color?: 'indigo' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'emerald' | 'gray';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    isPositive?: boolean;
  };
}

export function MetricaCard({
  icon: Icon,
  label,
  value,
  prefix,
  suffix,
  format = 'number',
  color = 'gray',
  trend,
}: MetricaCardProps) {
  const colorClasses = {
    indigo: 'text-indigo-600 bg-indigo-100',
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    purple: 'text-purple-600 bg-purple-100',
    emerald: 'text-emerald-600 bg-emerald-100',
    gray: 'text-gray-600 bg-gray-100',
  };

  const formatValue = (val: number): string => {
    switch (format) {
      case 'compact':
        return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(val);
      case 'currency':
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'percent':
        return val.toFixed(1);
      default:
        return val.toLocaleString('pt-BR');
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>

        {trend && (
          <TrendIndicator
            value={trend.value}
            direction={trend.direction}
            isPositive={trend.isPositive}
          />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">
          {prefix}{formatValue(value)}{suffix}
        </p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// =====================================================
// TREND INDICATOR
// =====================================================

interface TrendIndicatorProps {
  value: number;
  direction: 'up' | 'down';
  isPositive?: boolean;
}

function TrendIndicator({ value, direction, isPositive }: TrendIndicatorProps) {
  const isGood = isPositive ?? direction === 'up';
  const TrendIcon = direction === 'up' ? TrendingUp : TrendingDown;
  const colorClass = isGood ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      <TrendIcon className="w-3 h-3" />
      <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
    </div>
  );
}

// =====================================================
// STATS GRID
// =====================================================

interface Stat {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  color?: string;
}

interface StatsGridProps {
  stats: Stat[];
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-gray-50 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            {stat.icon && <stat.icon className={`w-4 h-4 ${stat.color || 'text-gray-500'}`} />}
            <span className="text-sm text-gray-500">{stat.label}</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// MINI METRIC
// =====================================================

interface MiniMetricProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
}

export function MiniMetric({ label, value, icon: Icon, trend }: MiniMetricProps) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-1.5 bg-gray-100 rounded">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{value}</span>
          {trend && (
            <span className={`text-xs ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-gray-400'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PROGRESS METRIC
// =====================================================

interface ProgressMetricProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'indigo';
}

export function ProgressMetric({
  label,
  current,
  max,
  unit = '',
  color = 'indigo'
}: ProgressMetricProps) {
  const percentage = Math.min((current / max) * 100, 100);

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">
          {current.toLocaleString('pt-BR')}{unit} / {max.toLocaleString('pt-BR')}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default MetricasCards;
