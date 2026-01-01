# Guia de Tipos - Versix Norma

## 📋 Princípio Fundamental

**NUNCA crie tipos manualmente para tabelas do banco de dados.**

A fonte única da verdade é o schema do Supabase. Todos os tipos devem derivar de `database.types.ts`.

---

## 🏗️ Estrutura de Tipos

```
packages/shared/
├── database.types.ts          # ← Gerado automaticamente (NÃO EDITAR)
├── src/types/
│   ├── derived.ts            # ← Tipos derivados do banco (USE AQUI)
│   ├── assembleias.ts        # ⚠️ DEPRECATED - migrar para derived.ts
│   ├── operational.ts        # ⚠️ DEPRECATED - migrar para derived.ts
│   └── ...                   # ⚠️ DEPRECATED - migrar para derived.ts
└── index.ts                   # Exporta tudo
```

---

## ✅ Como Usar os Tipos Corretamente

### 1. Importe do `@versix/shared`

```typescript
// ✅ CORRETO
import {
  ChamadoComJoins,
  ChamadoStatus,
  CreateChamadoInput,
  PaginatedResponse
} from '@versix/shared';

// ❌ ERRADO - não use imports diretos dos arquivos legados
import { Chamado } from '@versix/shared/types/operational';
```

### 2. Use Tipos de Row para dados do banco

```typescript
import { Chamado, Usuario } from '@versix/shared';

// Chamado é Database['public']['Tables']['chamados']['Row']
const chamado: Chamado = await supabase
  .from('chamados')
  .select('*')
  .eq('id', id)
  .single();
```

### 3. Use Tipos Com Joins para queries com relacionamentos

```typescript
import { ChamadoComJoins } from '@versix/shared';

const chamado: ChamadoComJoins = await supabase
  .from('chamados')
  .select(`
    *,
    solicitante:usuarios!chamados_solicitante_id_fkey (nome, avatar_url, email),
    atendente:usuarios!chamados_atendente_id_fkey (nome)
  `)
  .eq('id', id)
  .single();

// Agora você tem:
// - chamado.solicitante?.nome
// - chamado.atendente?.nome
```

### 4. Use Enums do banco

```typescript
import { ChamadoStatus, Prioridade } from '@versix/shared';

// ✅ Type-safe
const status: ChamadoStatus = 'novo'; // OK
const status2: ChamadoStatus = 'invalid'; // ❌ Erro de compilação

// ✅ Auto-complete funciona
const prioridade: Prioridade = 'alta';
```

### 5. Queries com múltiplas FKs para mesma tabela

Quando uma tabela tem **múltiplas foreign keys** para a mesma tabela, você DEVE usar o hint da FK:

```typescript
// ❌ ERRADO - Ambíguo
.select('*, usuario:usuario_id (nome)')

// ✅ CORRETO - Com hint da FK
.select('*, usuario:usuarios!tabela_usuario_id_fkey (nome)')
```

**Exemplos reais:**

```typescript
// chamados: solicitante_id e atendente_id → ambos para usuarios
.select(`
  *,
  solicitante:usuarios!chamados_solicitante_id_fkey (nome, avatar_url),
  atendente:usuarios!chamados_atendente_id_fkey (nome)
`)

// comunicados: autor_id → usuarios
.select(`
  *,
  autor:usuarios!comunicados_autor_id_fkey (nome, avatar_url)
`)
```

---

## 🔄 Regenerando Tipos

### Quando regenerar?

- Após qualquer mudança no schema do banco (migrations)
- Ao adicionar/remover tabelas
- Ao adicionar/remover colunas
- Ao mudar tipos de colunas
- Ao mudar enums

### Como regenerar?

```bash
# Opção 1: Com projeto remoto
export SUPABASE_PROJECT_ID=your-project-id
pnpm types:generate

# Opção 2: Com Supabase local
npx supabase start
pnpm supabase:gen-types

# Verificar mudanças
git diff packages/shared/database.types.ts

# Type-check
pnpm types:check
```

### Após regenerar:

1. **Revise `derived.ts`**: Se novos enums/tabelas foram adicionados, exporte-os
2. **Atualize tipos estendidos**: Se campos mudaram, ajuste os tipos `ComJoins`
3. **Execute build**: `pnpm build` para verificar quebras
4. **Commit**: `git add . && git commit -m "chore: atualizar database types"`

---

## 🎯 Checklist para Novos Hooks

Ao criar um hook que consome dados do Supabase:

- [ ] Importar tipos de `@versix/shared`
- [ ] Usar tipo `Row` para dados simples
- [ ] Criar tipo `ComJoins` se houver relacionamentos
- [ ] Usar hints de FK para queries com múltiplas FKs
- [ ] Transformar `Json | null` para tipos específicos (ex: `Anexo[]`)
- [ ] Tratar nullability corretamente
- [ ] Exportar apenas tipos de input/filtros do hook

**Template:**

```typescript
import {
  MinhaTabela,
  MinhaEnum,
  Anexo,
  Database
} from '@versix/shared';

type MinhaRow = Database['public']['Tables']['minha_tabela']['Row'];

interface MinhaQueryResult extends MinhaRow {
  relacionamento?: { campo: string } | null;
}

interface MinhaComJoins extends MinhaTabela {
  relacionamento?: { campo: string };
  anexos: Anexo[]; // transformado de Json | null
}

const toMinhaComJoins = (data: MinhaQueryResult): MinhaComJoins => ({
  ...data,
  anexos: (data.anexos as Anexo[] | null) ?? [],
  relacionamento: data.relacionamento ?? undefined,
});

export function useMinha() {
  const [items, setItems] = useState<MinhaComJoins[]>([]);
  // ...
}
```

---

## ⚠️ Problemas Comuns e Soluções

### Erro: "Property X does not exist on type Y"

**Causa:** Tipo manual desatualizado

**Solução:** Use o tipo derivado de `database.types.ts`

```typescript
// ❌ Tipo manual desatualizado
import { Chamado } from '@versix/shared/types/operational';

// ✅ Tipo correto do banco
import { Chamado } from '@versix/shared';
```

### Erro: "More than one relationship was found"

**Causa:** Query sem hint de FK

**Solução:** Adicione `!nome_da_fkey`

```typescript
// ❌ Ambíguo
.select('*, usuario:usuario_id (nome)')

// ✅ Específico
.select('*, usuario:usuarios!tabela_usuario_id_fkey (nome)')
```

### Erro: "Type 'null' is not assignable to..."

**Causa:** Campo nullable no banco mas não no tipo

**Solução:** Use optional chaining ou valores padrão

```typescript
// ❌ Assume não-null
const nome = usuario.nome;

// ✅ Trata null
const nome = usuario.nome ?? 'Sem nome';
const avatar = usuario.avatar_url ?? undefined;
```

### Erro: "Property 'length' does not exist on type 'Json'"

**Causa:** Campo `Json` não transformado para array

**Solução:** Cast e verificação de tipo

```typescript
// ❌ Usa Json diretamente
if (chamado.anexos.length > 0) { }

// ✅ Verifica tipo
const anexos = (chamado.anexos as Anexo[] | null) ?? [];
if (anexos.length > 0) { }

// ✅ Ainda melhor: Array.isArray
if (Array.isArray(chamado.anexos) && chamado.anexos.length > 0) { }
```

---

## 📚 Referências

- [Supabase Type Generation](https://supabase.com/docs/guides/api/generating-types)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [`packages/shared/src/types/derived.ts`](../packages/shared/src/types/derived.ts)

---

## 🚀 Comandos Úteis

```bash
# Regenerar tipos
pnpm types:generate

# Verificar tipos
pnpm types:check

# Build completo
pnpm build

# Formatar código
pnpm format

# Lint
pnpm lint:fix
```
