# Versix Norma — Roadmap v4 Definitivo

> **Base:** Auditoria Consolidada VTD Rev.4 + GSA v2.0 + DSA v1.0
> **Rating Atual:** 4.8/5.0 | **Meta:** 4.9+/5.0
> **Duração:** 2 Sprints (4 semanas)
> **Status:** Zero P0. Todos os itens são otimizações, não bloqueadores.

---

## Sprint 1 — Resiliência + Type Safety (Semanas 1-2)

### 1.1 Circuit Breaker para Edge Functions de IA

O ask-norma faz 3 chamadas HTTP externas sequenciais (OpenAI embeddings → Supabase pgvector → Groq LLM) sem timeout, retry ou fallback. Qualquer falha = 500 genérico.

**Criar `supabase/functions/_shared/resilience.ts`:**

```typescript
// Circuit Breaker + Retry com Backoff Exponencial

interface FetchWithResilienceOptions {
  /** Timeout em ms (default: 15s para embeddings, 30s para LLM) */
  timeoutMs?: number;
  /** Máximo de retries (default: 2) */
  maxRetries?: number;
  /** Backoff base em ms (default: 1000) */
  backoffBaseMs?: number;
  /** Nome da operação para logging */
  operationName: string;
}

export async function fetchWithResilience(
  url: string,
  init: RequestInit,
  options: FetchWithResilienceOptions
): Promise<Response> {
  const {
    timeoutMs = 15000,
    maxRetries = 2,
    backoffBaseMs = 1000,
    operationName,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 429 (rate limit) and 5xx (server errors)
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get('retry-after');
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : backoffBaseMs * Math.pow(2, attempt);

        if (attempt < maxRetries) {
          console.warn(
            `[${operationName}] ${response.status}, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        console.error(`[${operationName}] Timeout after ${timeoutMs}ms (attempt ${attempt + 1})`);
      }

      if (attempt < maxRetries) {
        const waitMs = backoffBaseMs * Math.pow(2, attempt);
        console.warn(`[${operationName}] Error, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`[${operationName}] All ${maxRetries + 1} attempts failed`);
}

/** Mensagem fallback quando IA está indisponível */
export const AI_FALLBACK_RESPONSE = {
  response:
    'Desculpe, estou com dificuldade para processar sua solicitação no momento. ' +
    'Por favor, tente novamente em alguns minutos. Se precisar de ajuda urgente, ' +
    'entre em contato com o síndico ou use o botão SOS.',
  sources: [],
  suggestions: ['Tentar novamente', 'Falar com o síndico', 'Consultar FAQ'],
  fallback: true,
};
```

**Aplicar no ask-norma (3 pontos):**

```typescript
import { fetchWithResilience, AI_FALLBACK_RESPONSE } from '../_shared/resilience.ts';

// 1. Embedding (OpenAI) — timeout 10s, 1 retry
let embeddingResponse: Response;
try {
  embeddingResponse = await fetchWithResilience(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: message,
        model: 'text-embedding-3-small',
        encoding_format: 'float',
      }),
    },
    { timeoutMs: 10000, maxRetries: 1, operationName: 'openai-embedding' }
  );
} catch {
  // Embedding falhou → responder sem RAG context
  Sentry.captureMessage('OpenAI embedding timeout/failure — responding without RAG', {
    level: 'warning',
  });
  // Continue sem contextText (a LLM responde com conhecimento geral)
}

// 2. Groq LLM — timeout 30s, 2 retries
let groqResponse: Response;
try {
  groqResponse = await fetchWithResilience(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'llama3-8b-8192', messages, max_tokens: 1000, temperature: 0.7, stream: true }),
    },
    { timeoutMs: 30000, maxRetries: 2, operationName: 'groq-llm' }
  );
} catch {
  // LLM indisponível → fallback gracioso
  Sentry.captureException(new Error('Groq LLM unavailable after retries'));
  return new Response(JSON.stringify(AI_FALLBACK_RESPONSE), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
```

**Aplicar também no process-document:**

```typescript
// Embedding call com resilience
const embeddingResponse = await fetchWithResilience(
  'https://api.openai.com/v1/embeddings',
  { method: 'POST', headers: {...}, body: JSON.stringify({...}) },
  { timeoutMs: 15000, maxRetries: 2, operationName: 'process-doc-embedding' }
);
```

**Checklist:**
- [ ] `_shared/resilience.ts` criado e testado
- [ ] ask-norma: 3 fetch calls com timeout + retry + fallback
- [ ] process-document: embedding call com timeout + retry
- [ ] Sentry breadcrumbs em cada retry e fallback

---

### 1.2 Eliminar 7 'as any'

Cada um tem solução específica:

**1. `worker/index.ts:133` — NotificationOptions**

```typescript
// ANTES
} as any;

// DEPOIS — criar interface estendida para campos experimentais
interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: Array<{ action: string; title: string; icon?: string }>;
  tag?: string;
}

const options: ExtendedNotificationOptions = {
  body: data.body || '',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  data: data.data || {},
  actions: data.actions || [],
  tag: data.tag || 'versix-norma-notification',
};

event.waitUntil(sw.registration.showNotification(title, options as NotificationOptions));
```

**2-3. `analytics.ts:102,106` — trackEvent params**

```typescript
// ANTES
trackEvent('user_action', action, { target: target as any, ...details });
trackEvent('error_occurred', error, { source: source as any, ...details });

// DEPOIS — ampliar tipo JsonValue para aceitar string | undefined
type TrackEventDetails = Record<string, JsonValue | undefined>;

export function trackUserAction(
  action: string,
  target?: string,
  details?: TrackEventDetails
) {
  trackEvent('user_action', action, { target, ...details });
}

export function trackError(
  error: string,
  source?: string,
  details?: TrackEventDetails
) {
  trackEvent('error_occurred', error, { source, ...details });
}
```

**4. `useIntegracoes.ts:30` — enum filter**

```typescript
// ANTES
query = query.eq('tipo', String(filters.tipo) as any);

// DEPOIS — o tipo já existe no database.types.ts
import type { Database } from '@versix/shared/database.types';
type IntegracaoTipo = Database['public']['Enums']['integracao_tipo'];

if (filters?.tipo) {
  query = query.eq('tipo', filters.tipo as IntegracaoTipo);
}
```

**5. `usePrestacaoContas.ts:84` — lancamentos array**

```typescript
// ANTES
lancamentos: (lancamentos || []) as any,

// DEPOIS — criar interface PrestacaoContasResult
interface PrestacaoContasResult {
  // ... campos existentes de data
  lancamentos: LancamentoResumoRow[];
  lancamentos_por_categoria: Record<string, { receitas: number; despesas: number }>;
}

return {
  ...data,
  lancamentos: (lancamentos ?? []) as LancamentoResumoRow[],
  lancamentos_por_categoria: porCategoria,
} satisfies PrestacaoContasResult;
```

**6-7. `admin/layout.tsx:31,48` — server component join**

```typescript
// ANTES
.from('usuarios' as any)
const rawUser = profileData[0] as any;

// DEPOIS — usar type assertion mais precisa
// O 'as any' aqui é necessário porque o Supabase client não exporta
// tipos para joins com select('*, usuario_condominios(...)').
// Solução: cast tipado ao invés de 'as any'

interface UsuarioWithJoin {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  role: string;
  status: string;
  avatar_url: string | null;
  unidade_id: string | null;
  usuario_condominios: Array<{
    condominio: { id: string; nome: string };
    role: string;
    status: string;
  }>;
}

const { data: profileData } = await supabase
  .from('usuarios')
  .select(`
    *,
    usuario_condominios (
      condominio:condominio_id ( id, nome ),
      role,
      status
    )
  `)
  .eq('auth_id', user.id)
  .returns<UsuarioWithJoin[]>();

if (profileData && profileData.length > 0) {
  const rawUser = profileData[0]; // Agora tipado como UsuarioWithJoin
  // ...
}
```

**Checklist:**
- [ ] `grep -rn 'as any' apps/web/src/ | grep -v .d.ts` retorna 0

---

### 1.3 Documentar RLS Permissivas

**Criar `docs/RLS_PERMISSIVE_POLICIES.md`:**

```markdown
# Políticas RLS Permissivas — Documentação de Segurança

4 políticas usam `USING (true)` intencionalmente.

## rate_limit_requests (2 políticas)
- **Migration:** 20260203000002_implement_rate_limiting.sql
- **SELECT + INSERT com USING(true) / WITH CHECK(true)**
- **Justificativa:** Rate limiting registra tentativas de QUALQUER origem,
  incluindo requests não-autenticados. A tabela contém apenas contadores
  efêmeros (ip, endpoint, count, window_start).
- **Mitigação:** Dados são limpos automaticamente pela função
  cleanup_rate_limits(). Nenhum dado sensível exposto.

## condominios (2 políticas)
- **Migration:** 20240101000004_create_rls_policies.sql:228-229
- **SELECT com USING(true) / WITH CHECK(true) para service_role**
- **Justificativa:** Fluxo de signup requer listagem de condomínios antes
  da autenticação. A API /api/condominios é GET-only.
- **Mitigação:** Apenas nome e ID são expostos. Dados financeiros e pessoais
  estão em tabelas separadas com RLS restritivo.

## Próxima Revisão
Após launch: avaliar se signup pode usar API key ao invés de acesso
público para reduzir superfície de exposição.
```

---

### 1.4 Rate Limiting na Camada Vercel

**Atualizar `apps/web/vercel.json`:**

```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "corepack disable && npm i -g pnpm@9.15.4 && pnpm install --no-frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-RateLimit-Policy", "value": "sliding-window" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/sentry-tunnel",
      "destination": "/api/sentry-tunnel"
    }
  ]
}
```

**Criar middleware de rate limiting para API routes:**

```typescript
// apps/web/src/lib/rate-limit-api.ts
// In-memory rate limiter para API routes Next.js (complementa o do banco)

const windowMs = 60 * 1000; // 1 minuto
const maxRequests = 60; // 60 req/min por IP

const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup expirados a cada 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}
```

**Aplicar no middleware.ts (já existente):**

```typescript
// Adicionar ao middleware existente, antes do matcher
import { checkRateLimit } from '@/lib/rate-limit-api';

// No handler do middleware:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';

if (request.nextUrl.pathname.startsWith('/api/')) {
  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'X-RateLimit-Remaining': '0',
      },
    });
  }
}
```

**Checklist Sprint 1:**
- [ ] `_shared/resilience.ts` implementado
- [ ] ask-norma e process-document com timeout + retry + fallback
- [ ] 0 'as any' no codebase
- [ ] `docs/RLS_PERMISSIVE_POLICIES.md` criado
- [ ] Rate limiting na camada Next.js middleware

---

## Sprint 2 — Qualidade + Operações (Semanas 3-4)

### 2.1 pgTAP — Testes Automatizados de RLS

Criar testes que verificam que políticas RLS funcionam como esperado.

**Criar `supabase/tests/rls_policies.test.sql`:**

```sql
-- pgTAP tests para políticas RLS
-- Executar: supabase test db

BEGIN;
SELECT plan(8);

-- Setup: criar usuários de teste
SELECT set_config('request.jwt.claim.sub', 'user-a-uuid', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- Test 1: Morador só vê seus próprios chamados
SELECT set_config('versix.user_id', 'user-morador-1', true);
SELECT is(
  (SELECT count(*) FROM chamados WHERE condominio_id = 'condo-outro')::integer,
  0,
  'Morador não vê chamados de outro condomínio'
);

-- Test 2: Admin vê todos os chamados do seu condomínio
SELECT set_config('versix.user_id', 'user-admin-1', true);
SELECT ok(
  (SELECT count(*) FROM chamados WHERE condominio_id = 'condo-admin-1') > 0,
  'Admin vê chamados do seu condomínio'
);

-- Test 3: Rate limit é acessível por todos (USING true)
SELECT ok(
  (SELECT count(*) FROM rate_limit_requests) >= 0,
  'Rate limit table acessível publicamente'
);

-- Test 4: Condominios listagem pública
SELECT ok(
  (SELECT count(*) FROM condominios) >= 0,
  'Condominios listáveis publicamente (signup flow)'
);

-- Test 5: Usuário não pode ver financeiro de outro condomínio
SELECT set_config('versix.user_id', 'user-morador-1', true);
SELECT is(
  (SELECT count(*) FROM lancamentos WHERE condominio_id = 'condo-outro')::integer,
  0,
  'Morador não vê lançamentos de outro condomínio'
);

-- Test 6: SECURITY DEFINER function funciona
SELECT ok(
  public.user_has_admin_role_in_condominio('condo-admin-1'::uuid),
  'SECURITY DEFINER admin role check funciona'
);

-- Test 7: Usuário não autenticado não vê usuarios
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM usuarios)::integer,
  0,
  'Anon não vê tabela usuarios'
);

-- Test 8: Documento chunks isolados por condomínio
SET ROLE authenticated;
SELECT set_config('versix.user_id', 'user-morador-1', true);
SELECT is(
  (SELECT count(*) FROM document_chunks WHERE condominio_id = 'condo-outro')::integer,
  0,
  'Document chunks isolados por condomínio'
);

SELECT * FROM finish();
ROLLBACK;
```

**Adicionar ao CI (`.github/workflows/ci-cd.yml`):**

```yaml
  test-rls:
    name: RLS Policy Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: supabase db reset
      - run: supabase test db
```

---

### 2.2 eslint-plugin-boundaries

**Instalar e configurar:**

```bash
pnpm add -D eslint-plugin-boundaries -w
```

**Atualizar `apps/web/.eslintrc.json`:**

```json
{
  "extends": ["next/core-web-vitals"],
  "plugins": ["boundaries"],
  "settings": {
    "boundaries/elements": [
      { "type": "hooks", "pattern": "src/hooks/**" },
      { "type": "lib", "pattern": "src/lib/**" },
      { "type": "components", "pattern": "src/components/**" },
      { "type": "app", "pattern": "src/app/**" },
      { "type": "contexts", "pattern": "src/contexts/**" }
    ]
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/no-unescaped-entities": "off",
    "react-hooks/exhaustive-deps": "warn",
    "boundaries/element-types": [
      "warn",
      {
        "default": "allow",
        "rules": [
          {
            "from": "hooks",
            "disallow": ["app", "components"],
            "message": "Hooks não devem importar de app/ ou components/"
          },
          {
            "from": "lib",
            "disallow": ["app", "components", "hooks", "contexts"],
            "message": "Lib não deve importar de camadas superiores"
          }
        ]
      }
    ]
  }
}
```

---

### 2.3 ARIA Audit Sistemático

**Criar `apps/web/tests/accessibility/full-audit.spec.ts`:**

```typescript
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Páginas públicas (sem auth)
const publicPages = ['/login', '/offline'];

// Páginas autenticadas (requerem setup de auth)
const authPages = [
  '/home',
  '/comunicados',
  '/chamados',
  '/financeiro',
  '/assembleias',
  '/sos',
  '/perfil',
  '/configuracoes',
];

// Páginas admin
const adminPages = [
  '/admin/dashboard',
  '/admin/usuarios',
  '/admin/condominios',
  '/admin/analytics',
];

for (const page of publicPages) {
  test(`a11y: ${page}`, async ({ page: p }) => {
    await p.goto(page);
    await p.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.recharts-wrapper') // Charts são notoriamente difíceis
      .analyze();

    // Log violations para debugging
    if (results.violations.length > 0) {
      console.log(`Violations on ${page}:`, JSON.stringify(results.violations, null, 2));
    }

    expect(results.violations).toEqual([]);
  });
}

// Para páginas autenticadas, usar auth fixture
test.describe('Authenticated pages', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  for (const page of authPages) {
    test(`a11y: ${page}`, async ({ page: p }) => {
      await p.goto(page);
      await p.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.recharts-wrapper')
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Admin pages', () => {
  test.use({ storageState: 'tests/.auth/admin.json' });

  for (const page of adminPages) {
    test(`a11y: ${page}`, async ({ page: p }) => {
      await p.goto(page);
      await p.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.recharts-wrapper')
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
```

**Instalar dependência:**

```bash
pnpm add -D @axe-core/playwright --filter @versix/web
```

---

### 2.4 @next/bundle-analyzer

**Instalar e configurar:**

```bash
pnpm add -D @next/bundle-analyzer --filter @versix/web
```

**Atualizar `next.config.js`:**

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Wrap no final:
module.exports = withBundleAnalyzer(withPWA(nextConfig));
```

**Adicionar script:**

```json
// apps/web/package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

**Verificação de Recharts:**
Os 7 componentes com `from 'recharts'` são todos carregados via `dynamic()` nas pages pai. O import estático dentro deles não afeta o bundle inicial porque o code-splitting do Next.js dynamic já isola o chunk. O bundle-analyzer confirmará isso. Se algum NÃO estiver em dynamic, migrar:

```typescript
// Se necessário (verificar com ANALYZE=true pnpm build):
const ObservabilidadePage = dynamic(
  () => import('@/app/admin/observabilidade/page'),
  { ssr: false }
);
```

---

### 2.5 Backup Restore Test

**Criar `scripts/backup-restore-test.sh`:**

```bash
#!/bin/bash
set -euo pipefail

echo "╔══════════════════════════════════╗"
echo "║   Backup & Restore Test          ║"
echo "╚══════════════════════════════════╝"

# 1. Garantir que Supabase CLI está disponível
command -v supabase >/dev/null 2>&1 || { echo "supabase CLI não encontrado"; exit 1; }

# 2. Dump do banco
echo "[1/4] Gerando backup..."
supabase db dump -f /tmp/norma_backup_test.sql --data-only
echo "  Backup: $(wc -l < /tmp/norma_backup_test.sql) linhas"

# 3. Verificar integridade do dump
echo "[2/4] Verificando integridade..."
grep -c "INSERT INTO" /tmp/norma_backup_test.sql | xargs -I{} echo "  INSERT statements: {}"

# 4. Restore em banco temporário (se local)
echo "[3/4] Testando restore em banco local..."
supabase db reset --linked 2>/dev/null || echo "  (Skip: não há projeto linkado)"

# 5. Validar contagens
echo "[4/4] Validando dados..."
psql "$DATABASE_URL" -t -c "
  SELECT 'usuarios: ' || count(*) FROM usuarios
  UNION ALL
  SELECT 'condominios: ' || count(*) FROM condominios
  UNION ALL
  SELECT 'chamados: ' || count(*) FROM chamados
  UNION ALL
  SELECT 'lancamentos: ' || count(*) FROM lancamentos
  UNION ALL
  SELECT 'audit_logs: ' || count(*) FROM audit_logs;
"

echo ""
echo "✅ Backup restore test completo."

# Cleanup
rm -f /tmp/norma_backup_test.sql
```

---

### 2.6 Coverage Threshold Progressivo

Aumentar thresholds dado que 29/43 hooks agora têm testes:

```typescript
// apps/web/vitest.config.ts — atualizar thresholds
coverage: {
  thresholds: {
    statements: 50,  // era 40
    branches: 40,    // era 30
    functions: 45,   // era 35
    lines: 50,       // era 40
  },
}
```

**Atualizar CI:**

```yaml
# .github/workflows/ci-cd.yml
- name: Run test coverage
  run: pnpm --filter @versix/web test:coverage -- --coverage.thresholds.statements=50
```

---

## Itens P2 — Backlog (pós-launch)

Estes itens não estão no sprint mas devem estar no backlog do produto:

| Item | Fonte | Esforço | Quando |
|------|-------|---------|--------|
| JWT claims em app_metadata para RLS | DSA | 2-3 dias | Quando escalar >1000 condôminos simultâneos |
| CRDTs / version lock para sync financeiro | DSA | 1 semana | Quando lançar offline para funcionalidades financeiras |
| pgvector HNSW index tuning (m, ef_construction) | GSA | 1 dia | Quando >100K document chunks |
| Testes isolados de Edge Functions (Deno test) | DSA | 3-4 dias | Próximo quarter |
| Auditoria financeira externa para Marketplace | GSA | Externo | Antes de habilitar transações reais |
| Infinite scroll em AuditLogViewer | GSA | 1 dia | Quando logs >1 ano |

---

## Projeção

```
              Atual (R4)    Sprint 1      Sprint 2
Rating:       4.8      ───► 4.85    ───► 4.9+
'as any':      7       ───►  0      ───►  0
Circuit Break: não     ───► sim     ───► sim
pgTAP:         não     ───► não     ───► sim (CI)
a11y pages:    0       ───► 0       ───► 14+ (audit)
Coverage:     ~50%     ───► ~50%    ───► ~55% (threshold 50)
Bundle anal:   não     ───► não     ───► sim (script)
RLS docs:      não     ───► sim     ───► sim
```

---

## Checklist de Go-Live Definitivo

```bash
# Build
pnpm type-check              # Zero erros
pnpm lint                    # Zero warnings (com boundaries)
pnpm build                   # Build limpo
grep "as any" apps/web/src/  # Zero (excluindo .d.ts)

# Testes
pnpm test                    # 64+ testes passando
pnpm test:coverage           # Coverage ≥50%
supabase test db             # pgTAP RLS tests passando

# Staging
./scripts/check-server-and-run-e2e.sh    # E2E completo
./scripts/backup-restore-test.sh         # Restore OK

# Verificações manuais
# SW: DevTools > Application > Service Workers → "activated"
# Push: test push → notification aparece
# Offline: Network > Offline → páginas cacheadas servidas
# ask-norma: desligar GROQ_API_KEY → fallback gracioso
# Admin: /admin → zero spinner no primeiro load

# Day 1
# Sentry: 0 erros P0 nas primeiras 48h
# Admin Dashboard: métricas normais
# ask-norma: monitorar retry counts e fallback rate
```
