'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FunnelStep } from '@/lib/services/analyticsService';

interface FunnelChartProps {
  data: FunnelStep[];
  loading?: boolean;
}

const FUNNEL_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

export function FunnelChart({ data, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-[350px] items-center justify-center text-gray-500">
        Sem dados de funil
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            width={90}
          />
          <Tooltip
            formatter={(value: number) => [`${value}`, 'Usuários']}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rates */}
      <div className="flex justify-center gap-6">
        {data.slice(1).map((step, i) => (
          <div key={step.step} className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{step.rate}%</div>
            <div className="text-xs text-gray-500">
              {data[i].label} → {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
