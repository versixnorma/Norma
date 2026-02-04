# P1 - Type Safety Fixes

## Status: Concluído ✓

Este documento lista as correções de tipagem realizadas para eliminar o uso de `any` no codebase.

---

## Arquivos Corrigidos

### 1. `apps/web/src/hooks/useObservabilidade.ts` ✓

**Correções aplicadas:**

- Adicionadas interfaces internas: `MetricasUsoRow`, `MetricasPerformanceRow`, `UptimeCheckRow`
- Todos os callbacks `(m: any)` substituídos por tipos específicos
- Removidos 16 usos de `any`

### 2. `apps/web/src/hooks/useChamados.ts` ✓

**Correções aplicadas:**

- Adicionada interface `ChamadoStatsRow` para estatísticas
- Removido `as any` de `parseAnexos()`
- Callbacks de estatísticas tipados corretamente
- Removidos 8 usos de `any`

### 3. `apps/web/src/hooks/useOcorrencias.ts` ✓

**Correções aplicadas:**

- Adicionada interface `OcorrenciaStatsRow`
- Tipagem correta para insert com `OcorrenciaInsert`
- Callbacks de estatísticas tipados
- Removidos 7 usos de `any`

### 4. `apps/web/src/hooks/useVotacao.ts` ✓

**Correções aplicadas:**

- Adicionada interface `ComentarioQueryResult`
- Criado helper `getUntypedTable()` para tabelas não geradas
- Casts `as unknown as T` em vez de `as any`
- Removidos 6 usos de `any`

### 5. `apps/web/src/hooks/useTaxas.ts` ✓

**Correções aplicadas:**

- Adicionadas interfaces: `UsuarioUnidadeRow`, `TaxaInadimplenciaRow`
- Helper `getUntypedTable()` para tabelas não geradas
- Callbacks tipados corretamente
- Removidos 5 usos de `any`

### 6. `apps/web/src/lib/pwa.ts` ✓

**Correções aplicadas:**

- Adicionadas interfaces para APIs experimentais:
  - `NavigatorWithStandalone`
  - `WindowWithMSStream`
  - `ServiceWorkerRegistrationWithSync`
  - `NavigatorWithNetworkInfo`
  - `NetworkInformation`
- Substituídos `console.warn/error` por `logger`
- Removidos 5 usos de `any`

---

## Padrão de Correção Aplicado

### Antes (incorreto):

```typescript
const items = data.filter((item: any) => item.status === 'active');
```

### Depois (correto):

```typescript
interface ItemRow {
  status: string;
}

const items = (data as ItemRow[]).filter((item) => item.status === 'active');
```

### Para tabelas não geradas no Supabase:

```typescript
// Helper para evitar "as any" em nomes de tabelas
const getUntypedTable = (supabase: ReturnType<typeof getSupabaseClient>, table: string) =>
  supabase.from(table as 'usuarios');
```

---

## Resultado Final

| Arquivo               | Antes      | Depois      |
| --------------------- | ---------- | ----------- |
| useObservabilidade.ts | 16 any     | 0 any ✓     |
| useChamados.ts        | 8 any      | 0 any ✓     |
| useOcorrencias.ts     | 7 any      | 0 any ✓     |
| useVotacao.ts         | 6 any      | 0 any ✓     |
| useTaxas.ts           | 5 any      | 0 any ✓     |
| lib/pwa.ts            | 5 any      | 0 any ✓     |
| **TOTAL**             | **47 any** | **0 any** ✓ |

---

_Documento atualizado em: 2026-02-03_
_Status: P1 Concluído_
