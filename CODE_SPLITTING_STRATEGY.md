# Code-Splitting Strategy - VERSIX NORMA

## Visão Geral

O code-splitting reduz o tamanho inicial do bundle ao carregar componentes pesados apenas quando necessário. Isso melhora significativamente o First Contentful Paint (FCP) e o Largest Contentful Paint (LCP).

## Implementação

### 1. Dynamic Imports com Next.js

Utilizamos `next/dynamic` para lazy-load componentes pesados:

```tsx
import dynamic from 'next/dynamic';

// Componente carregado sob demanda
export const NormaChatDynamic = dynamic(
  () => import('./features/NormaChat').then(mod => ({ default: mod.NormaChat })),
  {
    loading: () => <div>Carregando...</div>,
    ssr: false, // Não renderiza no servidor se não for necessário
  }
);
```

### 2. Webpack Configuration

Configuramos cache groups para separar vendors, UI, e código da aplicação:

- **vendors**: Bibliotecas externas (node_modules)
- **ui-components**: @radix-ui (componentes de UI)
- **charts**: recharts (gráficos)
- **shared**: Código compartilhado da aplicação

## Componentes Otimizados

### Pesados (> 200 linhas)
- ✅ NormaChat (269 linhas) → `NormaChatDynamic`
- ✅ AlertasPanel (350 linhas) → `AlertasPanelDynamic`
- ✅ MetricasCards (338 linhas) → `MetricasCardsDynamic`
- ✅ SystemStatus (263 linhas) → `SystemStatusDynamic`
- ✅ QuickAccess (201 linhas) → Em progresso
- ✅ DashboardFinanceiro (136 linhas) → `DashboardFinanceiroDynamic`

### Médios (100-200 linhas)
- ✅ ProfilePage (181 linhas) → Em progresso
- ✅ TransparencyPage (184 linhas) → Em progresso
- ✅ EmergenciaButton (179 linhas) → Em progresso
- ✅ WebhookEventosSelector (156 linhas) → Em progresso

## Impacto Esperado

- **Before**: ~469 kB (First Load JS)
- **Target**: ~380-400 kB (After code-splitting)
- **Reduction**: ~15-20% no bundle inicial

## Uso

Substituir imports diretos por dinâmicos:

### Antes
```tsx
import { NormaChat } from '@/components/features/NormaChat';

export function MyComponent() {
  return <NormaChat isOpen={true} onClose={() => {}} />;
}
```

### Depois
```tsx
import { NormaChatDynamic } from '@/components';

export function MyComponent() {
  return <NormaChatDynamic isOpen={true} onClose={() => {}} />;
}
```

## Monitoramento

Monitorar bundle size com:
```bash
pnpm build
# Verifica "First Load JS" nas saídas
```

## Referências

- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Webpack Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [Web Vitals](https://web.dev/vitals/)
