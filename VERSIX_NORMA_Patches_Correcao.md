# VERSIX NORMA - Patches de Correção

## 📁 Arquivo 1: apps/web/src/hooks/useComunicados.ts

### Problema

- `parseAnexos` usado mas não importado
- Tipo `Comunicado` não encontrado
- `ComunicadoStatus` não encontrado

### Correção (primeiras linhas)

```typescript
'use client';

import { getErrorMessage } from '@/lib/errors';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import { parseAnexos } from '@/lib/type-helpers'; // ADICIONAR ESTA LINHA
import type {
  ComunicadoCategoria,
  ComunicadoComJoins,
  ComunicadoFilters,
  ComunicadoStatus, // ADICIONAR ESTA LINHA
  CreateComunicadoInput,
  PaginatedResponse,
  UpdateComunicadoInput,
} from '@versix/shared';
import { Database } from '@versix/shared';
import { useCallback, useState } from 'react';

// Alias para Comunicado (Row do banco)
type Comunicado = Database['public']['Tables']['comunicados']['Row'];
```

---

## 📁 Arquivo 2: apps/web/src/hooks/useFAQ.ts

### Problema

- `CreateFAQInput`, `FAQFilters`, `UpdateFAQInput` não exportados

### Correção

```typescript
'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import type { FAQ, PaginatedResponse, BaseFilters } from '@versix/shared';
import { Database } from '@versix/shared';
import { useCallback, useState } from 'react';

// Definir tipos localmente já que não existem no shared
type FAQRow = Database['public']['Tables']['faq']['Row'];

interface CreateFAQInput {
  pergunta: string;
  resposta: string;
  categoria?: string;
  ordem?: number;
  ativo?: boolean;
  destaque?: boolean;
}

interface UpdateFAQInput extends Partial<CreateFAQInput> {}

interface FAQFilters extends BaseFilters {
  categoria?: string;
  ativo?: boolean;
  destaque?: boolean;
}
```

---

## 📁 Arquivo 3: apps/web/src/hooks/useAssembleias.ts

### Problema

- `filters?.ano` não existe (correto: `ano_referencia`)

### Correção (linha ~51)

```typescript
// ANTES:
if (filters?.ano)
  query = query
    .gte('data_realizacao', `${filters.ano}-01-01`)
    .lte('data_realizacao', `${filters.ano}-12-31`);

// DEPOIS:
if (filters?.ano_referencia) query = query.eq('ano_referencia', filters.ano_referencia);
```

---

## 📁 Arquivo 4: apps/web/src/components/comunicados/ComunicadoForm.tsx

### Problema

- `string | null` não atribuível a `string | undefined`

### Correção (linhas ~44-45 e ~111-115)

```typescript
// ANTES:
publicar_em: comunicado?.publicar_em || null,
expirar_em: comunicado?.expirar_em || null,

// DEPOIS:
publicar_em: comunicado?.publicar_em ?? undefined,
expirar_em: comunicado?.expirar_em ?? undefined,
```

---

## 📁 Arquivo 5: apps/web/src/components/integracoes/IntegracaoCard.tsx

### Problema

- Campos `eventos` e `conector` não existem em `IntegracaoDashboard`

### Opção A: Atualizar o tipo no shared

Em `packages/shared/src/validators/integracoes.ts`:

```typescript
export interface IntegracaoDashboard {
  integracao: Integracao;
  stats: {
    total_requests: number;
    success_rate: number;
    last_request: string | null;
  };
  eventos?: string[]; // Adicionar
  conector?: {
    tipo: string;
    nome: string;
    icone?: string;
  } | null; // Adicionar
}
```

### Opção B: Remover uso desses campos no componente

Se não forem necessários, remover as linhas que usam `integracao.eventos` e `integracao.conector`.

---

## 📁 Arquivo 6: apps/web/src/hooks/useEmergencias.ts

### Problema

- Interface `EmergenciaLog` tem campos diferentes do banco

### Correção

Adicionar ao `derived.ts`:

```typescript
// Verificar se tabela existe no banco
export type EmergenciaLog = Tables['emergencia_logs']['Row'];
```

OU definir localmente no hook:

```typescript
interface EmergenciaLog {
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

## 📁 Arquivo 7: apps/web/src/hooks/useFeatureFlags.ts

### Problema

- Interface `FeatureFlag` tem campos que não existem no banco

### Correção

```typescript
// No hook, usar tipo do banco diretamente:
type FeatureFlag = Database['public']['Tables']['feature_flags']['Row'];

// OU ajustar a interface local para corresponder ao banco:
interface FeatureFlag {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  escopo: string;
  condominios_habilitados: string[] | null;
  tiers_habilitados: ('starter' | 'professional' | 'enterprise')[] | null;
  created_at: string;
  updated_at: string;
}
```

---

## 📁 Arquivo 8: apps/web/src/hooks/useFinanceiro.ts

### Problema

- Interfaces `CategoriaFinanceira`, `ContaBancaria`, `LancamentoFinanceiro` divergem do banco

### Correção

Usar tipos do banco diretamente:

```typescript
import type { CategoriaFinanceira, ContaBancaria, LancamentoFinanceiro } from '@versix/shared';

// Remover interfaces locais duplicadas
```

---

## 📁 Arquivo 9: packages/shared/src/types/derived.ts

### Adicionar exports faltantes

```typescript
// ============================================
// FAQ TYPES (adicionar se não existirem)
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

// ============================================
// FEATURE FLAGS (adicionar se não existir)
// ============================================

export type FeatureFlag = Tables['feature_flags']['Row'];
```

---

## 📁 Arquivo 10: packages/shared/index.ts

### Garantir todos os exports

```typescript
// Re-exports do derived
export type {
  // Todos os tipos base
  Tables,
  Enums,
  Functions,

  // FAQ
  FAQ,
  FAQVoto,
  CreateFAQInput,
  UpdateFAQInput,
  FAQFilters,

  // Feature Flags
  FeatureFlag,

  // Comunicados
  Comunicado,
  ComunicadoComJoins,
  ComunicadoFilters,
  ComunicadoStatus,

  // ... outros tipos
} from './src/types/derived';
```

---

## 🔧 Comando para Aplicar Correções

```bash
# 1. Adicionar import de parseAnexos em useComunicados
sed -i "s/import { getErrorMessage }/import { parseAnexos } from '@\/lib\/type-helpers';\nimport { getErrorMessage }/" apps/web/src/hooks/useComunicados.ts

# 2. Corrigir ano para ano_referencia em useAssembleias
sed -i 's/filters?\.ano/filters?.ano_referencia/g' apps/web/src/hooks/useAssembleias.ts

# 3. Corrigir null para undefined em ComunicadoForm
sed -i 's/|| null/?? undefined/g' apps/web/src/components/comunicados/ComunicadoForm.tsx

# 4. Verificar erros restantes
cd apps/web && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

---

## ✅ Validação Final

Após aplicar as correções:

```bash
# Verificar tipos
cd apps/web && npx tsc --noEmit

# Verificar lint
pnpm lint

# Build
pnpm build
```

---

_Versix Team Developers - 01/01/2025_
