// =====================================================
// SPRINT 10: AlertasPanel Component
// Painel de alertas do sistema
// =====================================================

'use client';

import {
    useAlertasAtivos,
    useAlertasResumo,
    useIgnorarAlerta,
    useReconhecerAlerta,
    useResolverAlerta
} from '@/hooks/useObservabilidade';
import type { AlertaSistema, SeveridadeAlerta, StatusAlerta } from '@/types/observabilidade';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    AlertTriangle,
    Bell,
    Check,
    CheckCircle,
    Clock,
    Eye,
    EyeOff,
    Info,
    RefreshCw,
    XCircle
} from 'lucide-react';
import { useState } from 'react';

// =====================================================
// MAIN PANEL
// =====================================================

export function AlertasPanel() {
  const { data: alertas, isLoading, refetch } = useAlertasAtivos();
  const { data: resumo } = useAlertasResumo();
  const [filtroSeveridade, setFiltroSeveridade] = useState<SeveridadeAlerta | 'todos'>('todos');

  const alertasFiltrados = alertas?.filter(a =>
    filtroSeveridade === 'todos' || a.severidade === filtroSeveridade
  ) || [];

  const totalCriticos = resumo?.find(r => r.severidade === 'critical')?.abertos || 0;
  const totalErros = resumo?.find(r => r.severidade === 'error')?.abertos || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Alertas Ativos</h2>
            {(totalCriticos > 0 || totalErros > 0) && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                {totalCriticos + totalErros}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro */}
            <select
              value={filtroSeveridade}
              onChange={(e) => setFiltroSeveridade(e.target.value as 'todos' | 'critical' | 'error' | 'warning' | 'info')}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="todos">Todos</option>
              <option value="critical">Críticos</option>
              <option value="error">Erros</option>
              <option value="warning">Avisos</option>
              <option value="info">Info</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Resumo rápido */}
        {resumo && resumo.length > 0 && (
          <div className="flex gap-4 mt-3">
            {resumo.map(r => (
              <div key={r.severidade} className="flex items-center gap-1.5 text-sm">
                <SeveridadeIcon severidade={r.severidade} size="sm" />
                <span className="text-gray-600">{r.abertos}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de alertas */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Carregando alertas...
          </div>
        ) : alertasFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            Nenhum alerta ativo
          </div>
        ) : (
          alertasFiltrados.map(alerta => (
            <AlertaItem key={alerta.id} alerta={alerta} />
          ))
        )}
      </div>
    </div>
  );
}

// =====================================================
// ALERTA ITEM
// =====================================================

interface AlertaItemProps {
  alerta: AlertaSistema;
}

function AlertaItem({ alerta }: AlertaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const resolverMutation = useResolverAlerta();
  const reconhecerMutation = useReconhecerAlerta();
  const ignorarMutation = useIgnorarAlerta();

  const handleResolver = () => {
    resolverMutation.mutate({ alerta_id: alerta.id });
  };

  const handleReconhecer = () => {
    reconhecerMutation.mutate(alerta.id);
  };

  const handleIgnorar = () => {
    ignorarMutation.mutate(alerta.id);
  };

  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors ${
      alerta.severidade === 'critical' ? 'bg-red-50/50' : ''
    }`}>
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <SeveridadeIcon severidade={alerta.severidade} />

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 text-sm">
                {alerta.titulo}
              </h3>
              {alerta.descricao && (
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {alerta.descricao}
                </p>
              )}
            </div>

            {/* Status badge */}
            <StatusBadge status={alerta.status} />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(alerta.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>

            {alerta.ocorrencias > 1 && (
              <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                {alerta.ocorrencias}x
              </span>
            )}

            <span className="text-gray-400">{alerta.tipo}</span>
          </div>

          {/* Ações */}
          {alerta.status === 'aberto' && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleReconhecer}
                disabled={reconhecerMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <Eye className="w-3 h-3" />
                Reconhecer
              </button>

              <button
                onClick={handleResolver}
                disabled={resolverMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
              >
                <Check className="w-3 h-3" />
                Resolver
              </button>

              <button
                onClick={handleIgnorar}
                disabled={ignorarMutation.isPending}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 rounded transition-colors"
              >
                <EyeOff className="w-3 h-3" />
                Ignorar
              </button>
            </div>
          )}

          {/* Detalhes expandidos */}
          {expanded && alerta.dados && Object.keys(alerta.dados).length > 0 && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(alerta.dados, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Expand button */}
        {alerta.dados && Object.keys(alerta.dados).length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Info className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// SEVERIDADE ICON
// =====================================================

interface SeveridadeIconProps {
  severidade: SeveridadeAlerta;
  size?: 'sm' | 'md' | 'lg';
}

export function SeveridadeIcon({ severidade, size = 'md' }: SeveridadeIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const config = {
    critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  }[severidade];

  const Icon = config.icon;

  return (
    <div className={`p-1 rounded ${config.bg}`}>
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

interface StatusBadgeProps {
  status: StatusAlerta;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    aberto: { label: 'Aberto', color: 'text-red-600 bg-red-100' },
    reconhecido: { label: 'Visto', color: 'text-yellow-600 bg-yellow-100' },
    resolvido: { label: 'Resolvido', color: 'text-green-600 bg-green-100' },
    ignorado: { label: 'Ignorado', color: 'text-gray-500 bg-gray-100' },
  }[status];

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// =====================================================
// COMPACT ALERTS INDICATOR
// =====================================================

export function AlertasIndicator() {
  const { data: alertas } = useAlertasAtivos();

  const criticos = alertas?.filter(a => a.severidade === 'critical').length || 0;
  const erros = alertas?.filter(a => a.severidade === 'error').length || 0;
  const avisos = alertas?.filter(a => a.severidade === 'warning').length || 0;

  const total = criticos + erros + avisos;

  if (total === 0) {
    return (
      <div className="flex items-center gap-1.5 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">OK</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {criticos > 0 && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
          <XCircle className="w-3 h-3" />
          {criticos}
        </span>
      )}
      {erros > 0 && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded">
          <AlertTriangle className="w-3 h-3" />
          {erros}
        </span>
      )}
      {avisos > 0 && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-xs font-medium rounded">
          <AlertTriangle className="w-3 h-3" />
          {avisos}
        </span>
      )}
    </div>
  );
}

export default AlertasPanel;
