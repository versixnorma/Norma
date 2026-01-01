# Sentry Metrics Instrumentation Guide

## 📊 Visão Geral

Este guia descreve como instrumentar métricas customizadas no Sentry para monitoramento de funcionalidades críticas do VERSIX NORMA.

## 🎯 Funcionalidades Monitoradas

### 1. Norma Chat (IA Assistant)
**Métricas**:
- `norma_chat_message`: Tempo de resposta, tokens usados, se teve sources
- Detecta latência excessiva, falhas de API
- Rastreia uso de fallback (modo simulado)

**Eventos rastreados**:
```
- Message received
- Processing started
- Groq API called
- Response generated
- Sources retrieved
- Message sent to user
```

### 2. Financial Operations
**Métricas**:
- `financial_view`: Tempo para carregar dashboard/lançamentos
- `financial_create`: Tempo para criar novo lançamento
- `financial_update`: Tempo para atualizar lançamento
- `financial_export`: Tempo para exportar relatório

**Tags**:
- `condominio`: ID do condomínio
- `operation`: tipo de operação
- `itemCount`: número de itens processados

### 3. Assembleia Events
**Métricas**:
- `assembleia_vote`: Tempo para registrar voto
- `assembleia_view`: Tempo para carregar assembleia
- `assembleia_create`: Tempo para criar assembleia
- `assembleia_finalize`: Tempo para finalizar votação

**Rastreamento**:
- Participantes presentes vs total
- Taxa de votação
- Erros de quórum

## 🚀 Implementação

### Setup Básico

```typescript
import { recordMetric, trackAsyncOperation } from '@/lib/metrics';
import { useNormaChatMetrics, useFinancialMetrics } from '@/hooks/useMetrics';

// Em componentes
export function MyComponent() {
  const { trackMessage } = useNormaChatMetrics(condominioId, userId);

  const handleSendMessage = async (input: string) => {
    const startTime = performance.now();

    try {
      const response = await callNormaAPI(input);
      const responseTime = performance.now() - startTime;

      trackMessage(
        input,
        responseTime,
        response.hasSources,
        false, // hadError
        response.tokensUsed
      );
    } catch (error) {
      const responseTime = performance.now() - startTime;
      trackMessage(input, responseTime, false, true); // hadError = true
    }
  };
}
```

### Rastreando Operações Assíncronas

```typescript
import { trackAsyncOperation } from '@/lib/metrics';

async function loadFinancialData(condominioId: string) {
  return trackAsyncOperation(
    'financial_load',
    async () => {
      const data = await supabase
        .from('lancamentos')
        .select()
        .eq('condominio_id', condominioId);
      return data;
    },
    {
      condominio: condominioId,
      dataType: 'lancamentos',
    }
  );
}
```

### Breadcrumbs para Rastreamento

```typescript
import { addBreadcrumb } from '@/lib/metrics';

async function processVote(voteData: VoteInput) {
  addBreadcrumb('Vote started', 'vote', 'info', voteData);

  try {
    const result = await supabase.functions.invoke('vote-in-assembleia', {
      body: voteData,
    });

    addBreadcrumb('Vote completed', 'vote', 'info', { voteId: result.id });
    return result;
  } catch (error) {
    addBreadcrumb('Vote failed', 'vote', 'error', { error: String(error) });
    throw error;
  }
}
```

## 📈 Dashboard Sentry

### Métricas por Feature

1. **Norma Chat Performance**
   - Média de tempo de resposta
   - P95 de latência
   - Taxa de erro (falhas de API)
   - Uso de tokens

2. **Financial Operations**
   - Tempo por operação (view/create/update/export)
   - Taxa de erro
   - Volume de lançamentos processados

3. **Assembleia Events**
   - Taxa de participação
   - Tempo de votação
   - Erros de quórum

### Alertas Configurados

```
- Norma Chat: Se responseTime > 5000ms
- Financial: Se errorRate > 5%
- Assembleia: Se participationRate < 30%
```

## 🔍 Queries Sentry

### Top Slowest Operations
```
event.transaction:norma_chat_message p95(measurements.duration):>2000
```

### Erro by Component
```
event.tags.component:NormaChatError level:error
```

### Performance Comparison
```
event.transaction:[financial_view, financial_create]
```

## 🐛 Debugging com Metrics

### Identificar Performance Issues

```typescript
// Hook para debug
export function useDebugMetrics(enabled: boolean = false) {
  return useCallback((metricName: string, data: any) => {
    if (!enabled) return;

    console.group(`📊 Metric: ${metricName}`);
    console.table(data);
    console.groupEnd();
  }, [enabled]);
}
```

### Performance Observer

```typescript
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 3000) {
        console.warn(`⚠️ Slow operation: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
      }
    });
  });

  observer.observe({ entryTypes: ['measure', 'navigation'] });
}
```

## 📝 Exemplos por Componente

### NormaChat.tsx

```typescript
import { useNormaChatMetrics } from '@/hooks/useMetrics';

export function NormaChat({ isOpen, onClose }: NormaChatProps) {
  const { trackMessage } = useNormaChatMetrics(
    profile?.condominio_atual?.id || '',
    profile?.id || ''
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = performance.now();

    try {
      const response = await sendMessage(input);
      const responseTime = performance.now() - startTime;

      trackMessage(
        input,
        responseTime,
        response.sources && response.sources.length > 0,
        false,
        response.tokensUsed
      );
    } catch (error) {
      trackMessage(input, performance.now() - startTime, false, true);
    }
  };
}
```

### FinancialPage.tsx

```typescript
import { useFinancialMetrics } from '@/hooks/useMetrics';

export function FinancialPage() {
  const { trackOperation } = useFinancialMetrics(condominioId);

  useEffect(() => {
    trackOperation(
      'view',
      () => fetchDashboard(),
      lancamentos.length,
      totalValue
    );
  }, [condominioId, trackOperation]);
}
```

### AssembleiaPage.tsx

```typescript
import { useAssembleiaMetrics } from '@/hooks/useMetrics';

export function AssembleiaPage({ assembleiaId }: Props) {
  const { trackEvent } = useAssembleiaMetrics(condominioId, assembleiaId);

  const handleVote = async (voteData: VoteInput) => {
    await trackEvent(
      'vote',
      () => castVote(voteData),
      presentes.length
    );
  };
}
```

## 🔐 Privacy & GDPR

### Dados Coletados
- ✅ Tempos de operação
- ✅ IDs anônimos
- ❌ Conteúdo de mensagens
- ❌ Dados pessoais de usuários

### Configuração de Privacidade

```typescript
// Mascarar dados sensíveis em breadcrumbs
Sentry.init({
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data?.message) {
      breadcrumb.data.message = '***'; // Mascarar
    }
    return breadcrumb;
  },
});
```

## 📚 Referências

- [Sentry Performance Monitoring](https://docs.sentry.io/performance-monitoring/performance/)
- [Custom Metrics](https://docs.sentry.io/product/performance/metrics/)
- [Profiling](https://docs.sentry.io/profiling/)
- [Session Replay](https://docs.sentry.io/session-replay/)

## 🎯 Próximos Passos

1. ✅ Implementar em NormaChat (IA)
2. ✅ Implementar em Financial
3. ✅ Implementar em Assembleias
4. ⏳ Configurar alertas no Sentry
5. ⏳ Dashboard customizado
6. ⏳ Análise comparativa de performance
