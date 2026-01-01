# VERSIX NORMA - Auditoria Final e Correções Definitivas

## 📊 Status Atual

| Métrica                   | Valor |
| ------------------------- | ----- |
| Total de Erros TypeScript | 180   |
| Arquivos Afetados         | 25    |
| Hooks com Problemas       | 18    |
| Componentes com Problemas | 4     |

---

## 🔍 Análise dos 180 Erros Restantes

### Categorias de Erros

| Código | Qtd | Descrição                      |
| ------ | --- | ------------------------------ |
| TS2322 | 42  | Tipo não atribuível            |
| TS2339 | 39  | Propriedade não existe no tipo |
| TS2345 | 36  | Argumento incompatível         |
| TS2769 | 14  | Nenhum overload corresponde    |
| TS2305 | 8   | Módulo não exporta membro      |
| TS2304 | 8   | Nome não encontrado            |
| Outros | 33  | Diversos                       |

### Arquivos Mais Afetados

| Arquivo                  | Erros |
| ------------------------ | ----- |
| useOfflineSync.ts        | 25    |
| useVotacao.ts            | 14    |
| useTaxas.ts              | 14    |
| usePreferenciasCanais.ts | 13    |
| useComunicados.ts        | 11    |
| useNotificacoes.ts       | 11    |
| useFinanceiro.ts         | 11    |

---

## 🔧 Correções Necessárias

### 1. Exports Faltantes no @versix/shared

Adicionar ao arquivo `packages/shared/index.ts`:

```typescript
// Adicionar exports faltantes
export type {
  // FAQ
  CreateFAQInput,
  UpdateFAQInput,
  FAQFilters,

  // Comunicados
  Comunicado,
  ComunicadoStatus as ComunicadoStatusType,

  // Feature Flags
  FeatureFlag,

  // Emergências
  EmergenciaLog,

  // Exportações
  Exportacao,
  ExportacaoFormato,
  ExportacaoTipo,
} from './src/types/derived';
```

---

### 2. Correção do useComunicados.ts

**Problemas:**

- `parseAnexos` não importado
- Tipo `Comunicado` não encontrado
- Categorias incorretas (`aviso_geral`, `outros`, `eventos` não existem)

**Correção:**

```typescript
// Linha 1-10: Imports corrigidos
'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import { parseAnexos, safeNull } from '@/lib/type-helpers';
import type {
  Comunicado,
  ComunicadoComJoins,
  ComunicadoFilters,
  ComunicadoStatus,
  ComunicadoCategoria,
  Anexo,
} from '@versix/shared';
import { Database } from '@versix/shared';

// Tipo derivado do banco
type ComunicadoRow = Database['public']['Tables']['comunicados']['Row'];

// Converter Row para ComunicadoComJoins
function toComunicado(
  row: ComunicadoRow & { autor?: { nome: string; avatar_url: string | null } | null }
): ComunicadoComJoins {
  return {
    ...row,
    anexos: parseAnexos(row.anexos),
    autor: row.autor ?? undefined,
  };
}

// Mapeamento de categorias antigas para novas
function mapCategoria(cat: string): ComunicadoCategoria {
  const mapping: Record<string, ComunicadoCategoria> = {
    aviso_geral: 'geral',
    outros: 'geral',
    eventos: 'evento',
  };
  return mapping[cat] ?? (cat as ComunicadoCategoria);
}
```

---

### 3. Correção do useFAQ.ts

**Problema:** Tipos `CreateFAQInput`, `FAQFilters`, `UpdateFAQInput` não exportados.

**Correção:** Adicionar ao `derived.ts`:

```typescript
// ============================================
// FAQ TYPES
// ============================================

export interface CreateFAQInput {
  pergunta: string;
  resposta: string;
  categoria?: string;
  ordem?: number;
  ativo?: boolean;
  destaque?: boolean;
}

export interface UpdateFAQInput extends Partial<CreateFAQInput> {}

export interface FAQFilters extends BaseFilters {
  categoria?: string;
  ativo?: boolean;
  destaque?: boolean;
}
```

---

### 4. Correção do useFeatureFlags.ts

**Problema:** Interface `FeatureFlag` tem campos diferentes do banco.

**Correção:** Usar tipo do banco diretamente:

```typescript
// Em derived.ts, adicionar:
export type FeatureFlag = Tables['feature_flags']['Row'];

// Em useFeatureFlags.ts:
import type { FeatureFlag } from '@versix/shared';
// Remover interface local que tem campos errados
```

---

### 5. Correção do useEmergencias.ts

**Problema:** Interface `EmergenciaLog` tem campos que não existem no banco.

**Correção:** Adicionar ao `derived.ts`:

```typescript
// Tipo correto baseado na tabela real
export type EmergenciaLog = Tables['emergencia_logs']['Row'];

// OU se a tabela não existe, definir com campos corretos:
export interface EmergenciaLog {
  id: string;
  condominio_id: string;
  disparado_por: string | null;
  disparado_por_nome: string | null;
  notificacao_id: string | null;
  tempo_primeiro_envio_ms: number | null;
  total_enviados: number | null;
  total_entregues: number | null;
  total_erros: number | null;
  total_voz_enviados: number | null;
  created_at: string;
}
```

---

### 6. Correção do IntegracaoCard.tsx

**Problema:** `IntegracaoDashboard` não tem campos `eventos` e `conector`.

**Correção:** Atualizar interface em `validators/integracoes.ts`:

```typescript
export interface IntegracaoDashboard {
  integracao: Integracao;
  stats: {
    total_requests: number;
    success_rate: number;
    last_request: string | null;
  };
  // Adicionar campos faltantes
  eventos?: WebhookEvento[];
  conector?: Conector | null;
}
```

---

### 7. Correção do useAssembleias.ts

**Problema:** Campo `ano` não existe em `AssembleiaFilters` (correto é `ano_referencia`).

**Correção:**

```typescript
// Linha 51 - Antes:
if (filters?.ano) query = query.eq('ano_referencia', filters.ano);

// Depois:
if (filters?.ano_referencia) query = query.eq('ano_referencia', filters.ano_referencia);
```

---

### 8. Correção do useChamados.ts

**Problema:** `Anexo[]` não é atribuível a `Json`.

**Correção:** Serializar anexos antes de enviar:

```typescript
// Ao criar/atualizar chamado:
const { data, error } = await supabase.from('chamados').insert({
  ...input,
  anexos: JSON.stringify(input.anexos ?? []) as unknown as Json,
});
```

---

### 9. Correção do ComunicadoForm.tsx

**Problema:** `string | null` não é atribuível a `string | undefined`.

**Correção:**

```typescript
// Linha 44-45 - Antes:
publicar_em: comunicado?.publicar_em,
expirar_em: comunicado?.expirar_em,

// Depois:
publicar_em: comunicado?.publicar_em ?? undefined,
expirar_em: comunicado?.expirar_em ?? undefined,
```

---

### 10. Correção do useFinanceiro.ts

**Problema:** Interfaces `CategoriaFinanceira`, `ContaBancaria`, `LancamentoFinanceiro` têm campos faltantes.

**Correção:** Usar tipos do banco diretamente:

```typescript
// Já definidos em derived.ts:
export type CategoriaFinanceira = Tables['categorias_financeiras']['Row'];
export type ContaBancaria = Tables['contas_bancarias']['Row'];
export type LancamentoFinanceiro = Tables['lancamentos_financeiros']['Row'];

// No hook, remover interfaces locais e usar os tipos exportados
```

---

## 📝 Arquivo de Type Helpers Atualizado

```typescript
// apps/web/src/lib/type-helpers.ts

import type { Json } from '@versix/shared';

/**
 * Tipo genérico para anexos
 */
export interface Anexo {
  url: string;
  tipo: string;
  nome: string;
  tamanho: number;
  uploaded_at?: string;
}

/**
 * Converter Json para Anexo[]
 */
export function parseAnexos(anexos: Json | null | undefined): Anexo[] {
  if (!anexos) return [];
  if (!Array.isArray(anexos)) return [];
  return anexos as Anexo[];
}

/**
 * Converter Anexo[] para Json (para enviar ao banco)
 */
export function serializeAnexos(anexos: Anexo[] | undefined): Json {
  if (!anexos || anexos.length === 0) return [];
  return anexos as unknown as Json;
}

/**
 * Converter null para undefined (para joins opcionais)
 */
export function safeNull<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/**
 * Converter string | null para string | undefined
 */
export function nullToUndefined(value: string | null): string | undefined {
  return value ?? undefined;
}

/**
 * Parse JSON seguro com tipo genérico
 */
export function parseJson<T>(json: Json | null | undefined, defaultValue: T): T {
  if (json === null || json === undefined) return defaultValue;
  return json as T;
}
```

---

## 🚀 Script de Correção Automatizada

Execute na raiz do projeto:

```bash
#!/bin/bash

# 1. Substituir 'ano' por 'ano_referencia' em useAssembleias
sed -i "s/filters\?\.ano/filters?.ano_referencia/g" apps/web/src/hooks/useAssembleias.ts

# 2. Adicionar ?? undefined para campos que podem ser null
find apps/web/src -name "*.tsx" -exec sed -i 's/comunicado?\.\(publicar_em\|expirar_em\)/comunicado?.\1 ?? undefined/g' {} \;

# 3. Verificar erros
cd apps/web && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

---

## ✅ Checklist de Validação

Antes de fazer deploy:

```bash
# 1. Verificar tipos
cd apps/web && npx tsc --noEmit

# 2. Verificar lint
pnpm lint

# 3. Build local
pnpm build

# 4. Se passar, commitar
git add -A
git commit -m "fix: resolve todos os erros de TypeScript"
git push origin main
```

---

## 📋 Ordem de Prioridade das Correções

| #   | Correção                    | Impacto | Erros |
| --- | --------------------------- | ------- | ----- |
| 1   | Exports faltantes no shared | CRÍTICO | ~20   |
| 2   | useComunicados.ts           | ALTO    | 11    |
| 3   | useFinanceiro.ts            | ALTO    | 11    |
| 4   | useFeatureFlags.ts          | MÉDIO   | 3     |
| 5   | useFAQ.ts                   | MÉDIO   | 3     |
| 6   | useEmergencias.ts           | MÉDIO   | 3     |
| 7   | useAssembleias.ts           | MÉDIO   | 6     |
| 8   | IntegracaoCard.tsx          | MÉDIO   | 8     |
| 9   | ComunicadoForm.tsx          | BAIXO   | 4     |
| 10  | useChamados.ts              | BAIXO   | 6     |

---

## 🔒 Prevenção Futura

### 1. Pre-commit Hook

Adicionar ao `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Verificando tipos..."
cd apps/web && npx tsc --noEmit || exit 1
echo "✅ Tipos OK"
```

### 2. GitHub Action

```yaml
# .github/workflows/type-check.yml
name: Type Check
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: cd apps/web && npx tsc --noEmit
```

### 3. Documentação

Quando modificar o schema do banco:

1. Regenerar tipos: `npx supabase gen types typescript`
2. Verificar `derived.ts`
3. Rodar `pnpm build`
4. Commitar tudo junto

---

_Versix Team Developers - 01/01/2025_
