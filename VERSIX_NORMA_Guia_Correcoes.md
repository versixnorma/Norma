# VERSIX NORMA - Guia de Correções Práticas

## 🎯 Objetivo

Este documento fornece as correções práticas para resolver os 224 erros de TypeScript e permitir o deploy no Vercel.

---

## 📋 Pré-requisitos

Antes de começar, execute:

```bash
# 1. Regenerar tipos do Supabase (OBRIGATÓRIO)
npx supabase gen types typescript --project-id <seu-project-id> > packages/shared/database.types.ts

# 2. Verificar o que mudou
git diff packages/shared/database.types.ts
```

---

## 🔧 Correção 1: Criar Helper de Conversão de Tipos

Crie o arquivo `apps/web/src/lib/type-helpers.ts`:

```typescript
import type { Json } from '@versix/shared';

/**
 * Helpers para converter tipos Json do banco para tipos específicos
 */

// Tipo genérico para anexos
export interface Anexo {
  url: string;
  tipo: string;
  nome: string;
  tamanho: number;
  uploaded_at?: string;
}

// Converter Json para Anexo[]
export function parseAnexos(anexos: Json | null | undefined): Anexo[] {
  if (!anexos || !Array.isArray(anexos)) return [];
  return anexos as Anexo[];
}

// Converter Json para objeto genérico
export function parseJson<T>(json: Json | null | undefined, defaultValue: T): T {
  if (json === null || json === undefined) return defaultValue;
  return json as T;
}

// Safe null coalesce para joins
export function safeJoin<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}
```

---

## 🔧 Correção 2: Atualizar Exports do Shared

Atualize `packages/shared/src/index.ts` para usar derived.ts:

```typescript
// Re-exportar TODOS os tipos do derived.ts
export * from './types/derived';

// Exportar Database e Json
export type { Database, Json } from '../database.types';

// REMOVER exports de arquivos manuais problemáticos:
// - NÃO exportar de assembleias.ts
// - NÃO exportar de operational.ts
// - NÃO exportar de financial.ts
// - NÃO exportar de comunicacao.ts
```

---

## 🔧 Correção 3: Hooks Problemáticos

### 3.1 useExportacoes.ts (9 erros)

A tabela `exportacoes` não existe. Opções:

**Opção A - Criar a tabela:**
```sql
CREATE TABLE exportacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID REFERENCES condominios(id),
  tipo TEXT NOT NULL,
  formato TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  filtros JSONB,
  arquivo_url TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES usuarios(id)
);
```

**Opção B - Remover o hook (se não usado):**
```bash
rm apps/web/src/hooks/useExportacoes.ts
# Remover imports e usos
```

### 3.2 useFinancial.ts (22 erros)

Problemas:
- Tabela `lancamentos` não existe (usar `lancamentos_financeiros`)
- Tabela `boletos` não existe
- View `vw_dashboard_financeiro` não existe

```typescript
// Corrigir nomes de tabelas
// ANTES:
supabase.from('lancamentos')
// DEPOIS:
supabase.from('lancamentos_financeiros')
```

### 3.3 useFAQ.ts (17 erros)

Campos inexistentes: `util_sim`, `util_nao`, `tags`

```typescript
// A tabela tem apenas `votos_util`
// ANTES:
const total = faq.util_sim + faq.util_nao;
// DEPOIS:
const total = faq.votos_util ?? 0;
```

### 3.4 useOfflineSync.ts (25 erros)

Este hook tem muitos problemas de tipos. Recomendação: refatorar completamente usando tipos do derived.ts.

---

## 🔧 Correção 4: Componentes

### 4.1 FAQItem.tsx

```typescript
// ANTES:
{faq.tags?.map(tag => ...)}

// DEPOIS: (remover, campo não existe)
// Tags não existem na tabela FAQ
```

### 4.2 OcorrenciaCard.tsx

```typescript
// ANTES:
ocorrencia.reportado_por_usuario

// DEPOIS:
ocorrencia.reportado_por_info
```

### 4.3 IntegracaoCard.tsx

```typescript
// ANTES:
import type { IntegracaoDashboard } from '@versix/shared';

// DEPOIS:
import type { Integracao } from '@versix/shared';
// Ou definir localmente se necessário
```

---

## 🔧 Correção 5: Funções RPC Inexistentes

Funções chamadas que não existem no banco:

| Função | Ação |
|--------|------|
| `increment_comunicado_views` | Criar no banco OU substituir por UPDATE direto |
| `registrar_emergencia` | Criar no banco OU substituir por INSERT |
| `criar_exportacao` | Criar no banco OU substituir por INSERT |
| `calcular_saldo_periodo_otimizado` | Usar `calcular_saldo_periodo` |

**Exemplo de substituição:**

```typescript
// ANTES:
await supabase.rpc('increment_comunicado_views', { p_id: id });

// DEPOIS:
await supabase
  .from('comunicados')
  .update({ visualizacoes: supabase.sql`visualizacoes + 1` })
  .eq('id', id);
```

---

## 🔧 Correção 6: Queries com Múltiplas FKs

Quando há múltiplas foreign keys para a mesma tabela:

```typescript
// ANTES (ambíguo):
.select('*, solicitante:solicitante_id (nome)')

// DEPOIS (com hint de FK):
.select('*, solicitante:usuarios!chamados_solicitante_id_fkey (nome)')
```

---

## 📝 Checklist de Deploy

Antes de fazer push:

```bash
# 1. Verificar tipos
cd apps/web
npx tsc --noEmit

# 2. Verificar lint
pnpm lint

# 3. Tentar build local
pnpm build
```

---

## 🛡️ Prevenção Futura

### 1. Script de pré-commit

Adicione ao `.husky/pre-commit`:

```bash
#!/bin/sh
cd apps/web && npx tsc --noEmit
```

### 2. GitHub Action

```yaml
# .github/workflows/type-check.yml
name: Type Check
on: [push, pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: cd apps/web && npx tsc --noEmit
```

### 3. Documentação

Quando modificar o schema do banco:

1. Rodar `supabase gen types typescript`
2. Verificar se derived.ts precisa de novos tipos
3. Rodar `pnpm build` antes de commit

---

## 📊 Ordem de Prioridade

1. **CRÍTICO**: Regenerar database.types.ts
2. **CRÍTICO**: Criar type-helpers.ts
3. **ALTO**: Corrigir nomes de tabelas (lancamentos → lancamentos_financeiros)
4. **ALTO**: Corrigir/remover useExportacoes.ts
5. **MÉDIO**: Corrigir useFinancial.ts
6. **MÉDIO**: Corrigir useFAQ.ts
7. **BAIXO**: Limpar useOfflineSync.ts

---

*Versix Team Developers - 31/12/2024*
