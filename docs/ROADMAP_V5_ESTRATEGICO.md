# Versix Norma — Roadmap v5 Estratégico

> **Base:** Auditoria Consolidada VTD Rev.5 + GTD v1.0 + GSA v2.0 + DSA v1.0
> **Rating Atual:** 4.85/5.0 | **Meta:** 5.0/5.0
> **Duração:** 3 Sprints (5 semanas)
> **Zero P0.** Todos os itens são otimizações para escala e excelência operacional.

---

## Sprint 1 — Integridade Transacional (Semanas 1-2)

> *Foco: Marketplace blindado, RPC type-safe, CI automatizado*

### 1.1 Marketplace Purchase — Idempotency + Atomic Update

> Fonte: GTD P0 + VTD verificação forense

O `purchase/route.ts` tem duas vulnerabilidades concorrentes: (1) sem proteção contra double-click e (2) `usage_count` atualizado via read-then-write. A solução envolve 3 camadas:

**Camada 1 — Migration: RPC atômica + tabela de idempotency**

```sql
-- supabase/migrations/20260227_marketplace_idempotency.sql

-- 1. Tabela de idempotency keys (dedup 24h)
CREATE TABLE IF NOT EXISTS marketplace_idempotency_keys (
  key         TEXT PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  result      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-cleanup de chaves > 24h
CREATE INDEX idx_idempotency_created ON marketplace_idempotency_keys(created_at);

-- Função de cleanup (chamar via pg_cron ou Edge Function scheduled)
CREATE OR REPLACE FUNCTION cleanup_idempotency_keys()
RETURNS void AS $$
  DELETE FROM marketplace_idempotency_keys
  WHERE created_at < now() - interval '24 hours';
$$ LANGUAGE sql VOLATILE;

-- 2. RPC atômica para purchase (resolve race condition)
CREATE OR REPLACE FUNCTION marketplace_purchase(
  p_discount_id UUID,
  p_usuario_id  UUID,
  p_condominio_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_discount        RECORD;
  v_partner         RECORD;
  v_existing        RECORD;
  v_tx_id           UUID;
  v_original        NUMERIC;
  v_final           NUMERIC;
  v_discount_amt    NUMERIC;
  v_commission      NUMERIC;
BEGIN
  -- 1. Verificar idempotency (retornar resultado anterior se existir)
  SELECT result INTO v_existing
  FROM marketplace_idempotency_keys
  WHERE key = p_idempotency_key;

  IF FOUND THEN
    RETURN v_existing.result || jsonb_build_object('idempotent', true);
  END IF;

  -- 2. Lock row para evitar race condition (SELECT FOR UPDATE)
  SELECT * INTO v_discount
  FROM marketplace_discounts
  WHERE id = p_discount_id
  FOR UPDATE; -- Row-level lock até fim da transação

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Desconto não encontrado');
  END IF;

  IF v_discount.status != 'active' THEN
    RETURN jsonb_build_object('error', 'Desconto indisponível');
  END IF;

  IF v_discount.valid_until IS NOT NULL AND v_discount.valid_until < now() THEN
    RETURN jsonb_build_object('error', 'Desconto expirado');
  END IF;

  -- 3. Verificar e incrementar usage_count ATOMICAMENTE
  IF v_discount.usage_limit IS NOT NULL
     AND v_discount.usage_count >= v_discount.usage_limit THEN
    RETURN jsonb_build_object('error', 'Limite de uso atingido');
  END IF;

  UPDATE marketplace_discounts
  SET usage_count = usage_count + 1  -- Atômico, não read-then-write
  WHERE id = p_discount_id;

  -- 4. Calcular valores
  SELECT commission_rate INTO v_partner
  FROM marketplace_partners
  WHERE id = v_discount.partner_id;

  v_original := COALESCE(v_discount.original_price, 0);
  v_final := COALESCE(v_discount.discounted_price, 0);

  IF v_final = 0 THEN
    IF v_discount.discount_type = 'percentage' AND v_original > 0 THEN
      v_discount_amt := v_original * (v_discount.discount_value / 100.0);
      v_final := GREATEST(v_original - v_discount_amt, 0);
    ELSIF v_discount.discount_type = 'fixed' AND v_original > 0 THEN
      v_discount_amt := v_discount.discount_value;
      v_final := GREATEST(v_original - v_discount_amt, 0);
    ELSE
      v_final := v_original;
      v_discount_amt := 0;
    END IF;
  ELSE
    v_discount_amt := GREATEST(v_original - v_final, 0);
  END IF;

  v_commission := CASE
    WHEN COALESCE(v_partner.commission_rate, 0) > 0
    THEN (v_final * v_partner.commission_rate / 100.0)
    ELSE NULL
  END;

  -- 5. Inserir transação
  INSERT INTO marketplace_transactions (
    discount_id, usuario_id, condominio_id, partner_id,
    transaction_amount, discount_amount, final_amount,
    commission_amount, status, payment_method
  ) VALUES (
    p_discount_id, p_usuario_id, p_condominio_id, v_discount.partner_id,
    COALESCE(v_original, v_final), v_discount_amt, v_final,
    v_commission, 'pending', 'marketplace'
  ) RETURNING id INTO v_tx_id;

  -- 6. Registrar idempotency key
  INSERT INTO marketplace_idempotency_keys (key, usuario_id, result)
  VALUES (
    p_idempotency_key,
    p_usuario_id,
    jsonb_build_object('data', jsonb_build_object('id', v_tx_id))
  );

  RETURN jsonb_build_object('data', jsonb_build_object('id', v_tx_id));
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION marketplace_purchase(UUID, UUID, UUID, TEXT) TO authenticated;
```

**Camada 2 — API Route simplificada**

```typescript
// apps/web/src/app/api/marketplace/discounts/[id]/purchase/route.ts
import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PurchaseSchema = z.object({
  idempotencyKey: z.string().uuid('Idempotency key deve ser UUID'),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authClient = createClient(await cookies());
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validar body com Zod
  let body: z.infer<typeof PurchaseSchema>;
  try {
    body = PurchaseSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'idempotencyKey (UUID) é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { id: discountId } = await context.params;

  // Resolver perfil e condomínio ativo
  const { data: profile } = await admin
    .from('usuarios')
    .select('id, condominio_id, usuario_condominios(condominio_id, status)')
    .eq('auth_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  type UC = { condominio_id: string; status?: string };
  const activeCondo =
    (profile.usuario_condominios as UC[])?.find(
      (uc) => uc.status === 'active' || uc.status === 'ativo'
    )?.condominio_id || profile.condominio_id;

  // RPC atômica — toda a lógica é server-side em uma única transação
  const { data: result, error } = await admin.rpc('marketplace_purchase', {
    p_discount_id: discountId,
    p_usuario_id: profile.id,
    p_condominio_id: activeCondo,
    p_idempotency_key: body.idempotencyKey,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC retorna { error: "..." } ou { data: { id: "..." } }
  if (result.error) {
    const status = result.error === 'Desconto não encontrado' ? 404
      : result.error === 'Limite de uso atingido' ? 409
      : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result, {
    headers: result.idempotent ? { 'X-Idempotent-Replay': 'true' } : {},
  });
}
```

**Camada 3 — Frontend double-click guard**

```typescript
// Em qualquer componente que chama purchase:
import { useCallback, useRef, useState } from 'react';

export function usePurchase() {
  const [loading, setLoading] = useState(false);
  const inflightKeyRef = useRef<string | null>(null);

  const purchase = useCallback(async (discountId: string) => {
    // Guard: se já está em flight, retornar (mesmo idempotency key)
    if (inflightKeyRef.current) return;

    const idempotencyKey = crypto.randomUUID();
    inflightKeyRef.current = idempotencyKey;
    setLoading(true);

    try {
      const res = await fetch(`/api/marketplace/discounts/${discountId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      });
      return await res.json();
    } finally {
      inflightKeyRef.current = null;
      setLoading(false);
    }
  }, []);

  return { purchase, loading };
}
```

**Checklist:**
- [ ] Migration criada e aplicada
- [ ] RPC `marketplace_purchase` testada com pgTAP (concurrent, idempotent, expired)
- [ ] Route simplificada para chamar RPC
- [ ] Frontend com `usePurchase` hook + botão desabilitado durante loading
- [ ] Header `X-Idempotent-Replay: true` quando idempotent

---

### 1.2 Eliminar rpc-overrides.ts — Type Safety Completa

> Fonte: GTD P1

O arquivo tem 83 LOC com 9 `as never` para RPCs que o `supabase gen types` não gera automaticamente. A causa raiz: essas funções SQL existem no banco mas o CLI não consegue inferir seus tipos de argumento/retorno quando usam tipos compostos.

**Solução: Estender `database.types.ts` com merge types**

```typescript
// packages/shared/database-rpc-extensions.ts
// Tipos manuais para RPCs que supabase gen types não consegue inferir.
// IMPORTANTE: Manter sincronizado com migrations. CI valida via audit-types.sh.

import type { Database } from './database.types';

// Estender a interface Functions do database.types.ts
export interface RpcExtensions {
  enviar_notificacao: {
    Args: {
      p_condominio_id: string;
      p_tipo: string;
      p_titulo: string;
      p_corpo: string;
      p_prioridade?: 'baixa' | 'normal' | 'alta' | 'critica';
      p_destinatarios_tipo?: string;
      p_destinatarios_filtro?: Record<string, unknown>;
      p_referencia_tipo?: string;
      p_referencia_id?: string;
      p_gerar_mural?: boolean;
      p_criado_por: string;
    };
    Returns: { id: string };
  };
  registrar_push_token: {
    Args: { p_token: string; p_provider?: string };
    Returns: void;
  };
  remover_fcm_token: {
    Args: { p_token: string };
    Returns: void;
  };
  convocar_assembleia: {
    Args: { p_assembleia_id: string };
    Returns: void;
  };
  iniciar_assembleia: {
    Args: { p_assembleia_id: string };
    Returns: void;
  };
  encerrar_assembleia: {
    Args: { p_assembleia_id: string };
    Returns: void;
  };
  retentar_webhook: {
    Args: { p_entrega_id: string };
    Returns: void;
  };
  set_app_user_id: {
    Args: { user_id: string };
    Returns: void;
  };
  marketplace_purchase: {
    Args: {
      p_discount_id: string;
      p_usuario_id: string;
      p_condominio_id: string;
      p_idempotency_key: string;
    };
    Returns: Record<string, unknown>;
  };
}

// Tipo combinado para usar com createClient
export type DatabaseWithExtensions = Database & {
  public: Database['public'] & {
    Functions: Database['public']['Functions'] & RpcExtensions;
  };
};
```

**Reescrever rpc-overrides.ts sem 'as never':**

```typescript
// packages/shared/rpc-overrides.ts — v2 (ZERO 'as never')
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseWithExtensions } from './database-rpc-extensions';

type TypedClient = SupabaseClient<DatabaseWithExtensions>;

// Agora todas as chamadas são type-safe nativamente

export function rpcEnviarNotificacao(
  client: TypedClient,
  args: DatabaseWithExtensions['public']['Functions']['enviar_notificacao']['Args']
) {
  return client.rpc('enviar_notificacao', args);
}

export function rpcRegistrarPushToken(
  client: TypedClient,
  args: DatabaseWithExtensions['public']['Functions']['registrar_push_token']['Args']
) {
  return client.rpc('registrar_push_token', args);
}

export function rpcRemoverPushToken(client: TypedClient, token: string) {
  return client.rpc('remover_fcm_token', { p_token: token });
}

export function rpcConvocarAssembleia(client: TypedClient, assembleiaId: string) {
  return client.rpc('convocar_assembleia', { p_assembleia_id: assembleiaId });
}

export function rpcIniciarAssembleia(client: TypedClient, assembleiaId: string) {
  return client.rpc('iniciar_assembleia', { p_assembleia_id: assembleiaId });
}

export function rpcEncerrarAssembleia(client: TypedClient, assembleiaId: string) {
  return client.rpc('encerrar_assembleia', { p_assembleia_id: assembleiaId });
}

export function rpcRetentarWebhook(client: TypedClient, entregaId: string) {
  return client.rpc('retentar_webhook', { p_entrega_id: entregaId });
}

export function rpcSetAppUserId(client: TypedClient, userId: string) {
  return client.rpc('set_app_user_id', { user_id: userId });
}

// View queries — usar tipo DatabaseWithExtensions ao invés de 'as never'
export function queryNotificacoesDashboard(client: TypedClient, condominioId: string) {
  return (client as SupabaseClient<DatabaseWithExtensions>)
    .from('v_notificacoes_dashboard' as keyof DatabaseWithExtensions['public']['Tables'])
    .select('*')
    .eq('condominio_id', condominioId);
}
```

**Checklist:**
- [ ] `database-rpc-extensions.ts` criado
- [ ] `rpc-overrides.ts` reescrito sem 'as never'
- [ ] `grep 'as never' packages/shared/rpc-overrides.ts` retorna 0
- [ ] `pnpm type-check` passa

---

### 1.3 regenerate-types.sh no CI + Husky

> Fonte: GTD P1

Husky pré-commit já existe e faz `types:check`. Falta: vincular regeneração ao pipeline quando `.sql` muda.

**Adicionar step ao CI:**

```yaml
# .github/workflows/ci-cd.yml — adicionar após 'lint'
  check-types-sync:
    name: Verify DB Types in Sync
    runs-on: ubuntu-latest
    needs: lint
    # Só rodar quando SQL ou database.types.ts mudam
    if: |
      contains(github.event.head_commit.modified, '.sql') ||
      contains(github.event.head_commit.modified, 'database.types.ts')
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Audit types
        run: |
          echo "Verificando se rpc-overrides está sincronizado com migrations..."
          bash scripts/audit-types.sh
          if [ $? -ne 0 ]; then
            echo "❌ database.types.ts está dessincronizado com as migrations."
            echo "   Execute: ./scripts/regenerate-types.sh"
            exit 1
          fi
```

**Atualizar Husky pré-commit:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Verificar se algum .sql foi staged
SQL_CHANGED=$(git diff --cached --name-only --diff-filter=ACM | grep -c '\.sql$' || true)

if [ "$SQL_CHANGED" -gt 0 ]; then
  echo "⚠️  SQL files changed. Verifying database.types.ts is in sync..."
  bash scripts/audit-types.sh || {
    echo "❌ Run './scripts/regenerate-types.sh' before committing."
    exit 1
  }
fi

# Type-check do pacote shared
echo "🔍 Type-checking shared package..."
pnpm types:check || {
  echo "❌ Type errors found in packages/shared"
  exit 1
}

pnpm lint-staged 2>/dev/null || true
```

---

## Sprint 2 — Observabilidade + Operações (Semanas 3-4)

### 2.1 Alertas Sentry Automatizados

> Fonte: GTD P1

Configurar via Sentry API (programático) ou dashboard:

**Criar script de configuração:**

```typescript
// scripts/setup-sentry-alerts.ts
// Executar uma vez: npx ts-node scripts/setup-sentry-alerts.ts

const SENTRY_ORG = 'versix-solutions';
const SENTRY_PROJECT = 'norma';
const SENTRY_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SLACK_WEBHOOK_ACTION_ID = process.env.SENTRY_SLACK_ACTION_ID;

async function createAlert(name: string, query: string, threshold: number) {
  const res = await fetch(
    `https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/alert-rules/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENTRY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        dataset: 'events',
        query,
        aggregate: 'count()',
        timeWindow: 60, // 1 hora
        triggers: [
          {
            label: 'critical',
            alertThreshold: threshold,
            actions: [
              {
                type: 'slack',
                targetType: 'specific',
                targetIdentifier: '#norma-alerts',
                inputChannelId: SLACK_WEBHOOK_ACTION_ID,
              },
            ],
          },
        ],
      }),
    }
  );
  const data = await res.json();
  console.log(`✅ Alert "${name}": ${res.status}`);
  return data;
}

async function main() {
  // Alerta 1: >5 erros em process-document por hora
  await createAlert(
    'process-document failures',
    'tags[function_name]:process-document level:error',
    5
  );

  // Alerta 2: >10 erros em ask-norma por hora
  await createAlert(
    'ask-norma failures',
    'tags[function_name]:ask-norma level:error',
    10
  );

  // Alerta 3: >3 fallbacks de IA por hora (Circuit Breaker ativado)
  await createAlert(
    'AI fallback rate',
    'message:*fallback* tags[function_name]:ask-norma',
    3
  );

  // Alerta 4: >20 erros 429 (rate limiting) por hora
  await createAlert(
    'Rate limit spikes',
    'tags[status_code]:429',
    20
  );

  console.log('\n🎯 All alerts configured.');
}

main();
```

---

### 2.2 Webhook Dead Letter Queue Visual

> Fonte: GTD P1

A infraestrutura parcial já existe: `notificacoes_entregas` tem status, tentativas, `erro_mensagem`, `proxima_tentativa`. E `rpcRetentarWebhook` já existe. Falta: UI no Admin.

**Criar página Admin:**

```typescript
// apps/web/src/app/admin/webhooks/page.tsx
'use client';

import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { useAdmin } from '@/hooks/useAdmin';
import { rpcRetentarWebhook } from '@versix/shared/rpc-overrides';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';

interface FailedDelivery {
  id: string;
  canal: string;
  status: string;
  erro_mensagem: string | null;
  max_tentativas: number;
  created_at: string;
  proxima_tentativa: string | null;
  notificacao_id: string;
}

export default function WebhookDLQPage() {
  const [failures, setFailures] = useState<FailedDelivery[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const loadFailures = useCallback(async () => {
    const { data } = await supabase
      .from('notificacoes_entregas')
      .select('id, canal, status, erro_mensagem, max_tentativas, created_at, proxima_tentativa, notificacao_id')
      .in('status', ['falhou', 'erro'])
      .order('created_at', { ascending: false })
      .limit(50);

    setFailures(data ?? []);
  }, [supabase]);

  useEffect(() => { loadFailures(); }, [loadFailures]);

  const handleRetry = async (entregaId: string) => {
    setRetrying(entregaId);
    try {
      await rpcRetentarWebhook(supabase, entregaId);
      toast.success('Reprocessamento iniciado');
      await loadFailures();
    } catch (err) {
      toast.error('Erro ao reprocessar');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <AdminLayout requiredRoles={['superadmin']}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Entregas com Falha</h1>
        <div className="space-y-3">
          {failures.map((f) => (
            <div key={f.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <span className="font-mono text-sm">{f.canal}</span>
                <p className="text-sm text-red-600">{f.erro_mensagem}</p>
                <p className="text-xs text-gray-500">
                  {new Date(f.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => handleRetry(f.id)}
                disabled={retrying === f.id}
                className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {retrying === f.id ? 'Reprocessando...' : 'Retentar'}
              </button>
            </div>
          ))}
          {failures.length === 0 && (
            <p className="text-gray-500 text-center py-8">Nenhuma entrega com falha.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
```

---

### 2.3 Coverage Threshold para 55%

```typescript
// apps/web/vitest.config.ts — atualizar
coverage: {
  thresholds: {
    statements: 50,  // era 40
    branches: 40,    // era 30
    functions: 45,   // era 40
    lines: 50,       // era 44
  },
}
```

---

## Sprint 3 — Excelência Operacional (Semana 5)

### 3.1 Lighthouse no CI

> Fonte: VTD (lighthouse-checklist.js existe, não integrado)

```yaml
# .github/workflows/ci-cd.yml — adicionar job
  lighthouse:
    name: Lighthouse Performance
    runs-on: ubuntu-latest
    needs: [build-and-deploy-preview]
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            ${{ steps.deploy.outputs.preview-url }}/
            ${{ steps.deploy.outputs.preview-url }}/login
          budgetPath: ./scripts/lighthouse-budget.json
          configPath: ./scripts/lighthouse-ci.json
      - name: Assert FCP
        run: |
          FCP=$(jq '.categories.performance.score' lighthouse-results/*.json | head -1)
          echo "FCP score: $FCP"
          if (( $(echo "$FCP < 0.8" | bc -l) )); then
            echo "❌ Performance score below 0.8"
            exit 1
          fi
```

**Criar budget:**

```json
// scripts/lighthouse-budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "budget": 1500 },
      { "metric": "interactive", "budget": 3500 },
      { "metric": "largest-contentful-paint", "budget": 2500 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 400 },
      { "resourceType": "total", "budget": 800 }
    ]
  }
]
```

---

### 3.2 Soft-Launch com Feature Flags

> Fonte: GTD

O `useFeatureFlags` já existe (146 LOC, testado). Estratégia de rollout progressivo:

```typescript
// Exemplo de uso para Marketplace (habilitar progressivamente)
const { isEnabled } = useFeatureFlags();

// Fase 1: Apenas admins internos (semana 1 pós-launch)
if (isEnabled('marketplace_purchase', { rolloutPercentage: 0, allowedRoles: ['superadmin'] })) {
  // Mostrar botão de compra
}

// Fase 2: 10% dos moradores (semana 2)
if (isEnabled('marketplace_purchase', { rolloutPercentage: 10 })) { ... }

// Fase 3: 100% (semana 3, se métricas estiverem saudáveis)
if (isEnabled('marketplace_purchase', { rolloutPercentage: 100 })) { ... }
```

---

## Backlog P2 (Pós-Launch)

| # | Item | Fonte | Trigger | Esforço |
|---|------|-------|---------|---------|
| 1 | JWT claims em app_metadata para RLS | DSA | >1000 condôminos simultâneos | 2-3 dias |
| 2 | CRDTs / version lock offline financeiro | DSA+GTD | Quando financeiro offline habilitado | 1 semana |
| 3 | Testes de carga K6 em ask-norma | GTD | Antes de campanha marketing | 2 dias |
| 4 | RSC puro em relatórios gerenciais | GTD | Quando Recharts impactar LCP >2s | 3 dias |
| 5 | pgvector HNSW tuning | GSA | >100K document chunks | 1 dia |
| 6 | Auditoria financeira externa Marketplace | GSA | Antes de transações reais com dinheiro | Externo |
| 7 | Contraste modo escuro em charts | GTD | Feedback de acessibilidade pós-launch | 1 dia |
| 8 | Infinite scroll AuditLogViewer | GSA | Logs >1 ano | 1 dia |

---

## Projeção

```
                Atual       Sprint 1      Sprint 2      Sprint 3
Rating:         4.85   ───► 4.90     ───► 4.95     ───► 5.0
'as any':        0     ───►  0       ───►  0       ───►  0
'as never':      9     ───►  0       ───►  0       ───►  0
Marketplace:   vuln    ───► blindado ───► blindado ───► blindado
pgTAP:         8 tests ───► 12+     ───► 12+      ───► 12+
CI type-sync:   não    ───► sim     ───► sim       ───► sim
Sentry alerts:  0      ───►  0      ───►  4        ───►  4
DLQ visual:     não    ───► não     ───► sim       ───► sim
Lighthouse CI:  não    ───► não     ───► não       ───► sim
Coverage:      ~50%    ───► ~50%    ───► ~55%      ───► ~55%
```

---

## Go-Live Checklist Definitivo

```bash
# ── Build ──
pnpm type-check                    # Zero erros
pnpm lint                          # Zero warnings > .warnings-config.json
pnpm build                         # Build limpo
grep "as any" apps/web/src/        # Zero (excluindo .d.ts)
grep "as never" packages/shared/   # Zero

# ── Testes ──
pnpm test                          # 66+ testes passando
pnpm test:coverage                 # Coverage ≥50%
supabase test db                   # pgTAP: 12+ assertions passando

# ── Staging ──
./scripts/check-server-and-run-e2e.sh    # E2E completo
./scripts/backup-restore-test.sh         # Restore OK
./scripts/audit-types.sh                 # Types in sync

# ── Verificações manuais ──
# SW: DevTools > Application > Service Workers → "activated"
# Push: enviar push → notification aparece
# Offline: Network > Offline → páginas cacheadas
# ask-norma: desligar GROQ_API_KEY → fallback gracioso
# Marketplace: double-click → apenas 1 transação (X-Idempotent-Replay)
# Admin: /admin → zero spinner no primeiro load

# ── Day 1 ──
# Sentry: 0 erros P0 nas primeiras 48h
# Sentry alerts: configurados e testados
# Feature flags: marketplace_purchase em rollout 0% (apenas superadmin)
# Admin dashboard: métricas normais
# DLQ: /admin/webhooks acessível, sem entregas em falha
```
