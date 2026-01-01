// =====================================================
// SPRINT 10: ErrorBoundary Component
// Captura e exibe erros de forma amigável
// =====================================================

'use client';

import * as Sentry from '@sentry/react';
import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react';
import React, { Component, ReactNode } from 'react';

// =====================================================
// TYPES
// =====================================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  eventId?: string;
}

// =====================================================
// ERROR BOUNDARY CLASS
// =====================================================

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });

    this.setState({ errorInfo, eventId });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Erro capturado:', error);
      console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReport = () => {
    if (this.state.eventId) {
      Sentry.showReportDialog({ eventId: this.state.eventId });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Algo deu errado
            </h1>

            <p className="text-gray-600 text-center mb-6">
              Ocorreu um erro inesperado. Nossa equipe já foi notificada e está
              trabalhando para resolver o problema.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-mono text-red-800 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Ver stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar página
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Ir para início
              </button>
            </div>

            {this.state.eventId && (
              <button
                onClick={this.handleReport}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Bug className="w-4 h-4" />
                Reportar problema
              </button>
            )}

            {this.state.eventId && (
              <p className="text-xs text-gray-400 text-center mt-4">
                ID do erro: {this.state.eventId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =====================================================
// FUNCTIONAL WRAPPER
// =====================================================

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Erro ao carregar
        </h3>
        <p className="text-gray-600 text-sm mb-4 max-w-sm">
          {error.message || 'Ocorreu um erro inesperado'}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

// =====================================================
// EXPORTS
// =====================================================

export default ErrorBoundary;
