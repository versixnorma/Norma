## PR: Sprint 2 — Marketplace — Checklist de Ações Pendentes

Este PR/TODO lista as tarefas pendentes identificadas após revisão do Sprint 2 (Marketplace). Cada item tem link para o ficheiro relevante no repositório.

---

## Resumo

- Sprint 2: Marketplace — implementado em grande parte (schema, APIs, frontend, analytics).
- Pendências críticas: autorização middleware específico, integração de pagamentos/webhooks, testes E2E, revisão de segurança.

---

## Checklist (prioridade decrescente)

- [ ] Implementar middleware de autorização dedicado para marketplace (server-side)
  - Arquivo exemplo/onde integrar: `apps/web/src/middleware.ts` (middleware global)
  - Exemplo proposto no planeamento: `// middleware/marketplaceAuth.ts`

- [ ] Criar/validar `middleware/marketplaceAuth.ts` e aplicar às rotas públicas/privadas do marketplace
  - Locais onde aplicar: `apps/web/src/app/api/admin/marketplace/*` e `apps/web/src/app/api/marketplace/*`

- [ ] Implementar integração de pagamento (gateway) / webhooks (sandbox)
  - Rota de compra existente: `apps/web/src/app/api/marketplace/discounts/[id]/purchase/route.ts`
  - Confirmar/implementar: webhooks, verificação de pagamento, atualização de `marketplace_transactions`, antifraude

- [ ] Adicionar testes E2E (Playwright) cobrindo fluxos críticos
  - Casos mínimos: CRUD Parceiro, CRUD Desconto, compra (purchase flow), analytics (transações registradas)
  - Pasta testes E2E: `apps/web/tests/` (usar fixtures existentes em `apps/web/tests/fixtures/`)

- [ ] Verificar cobertura e qualidade das policies RLS e middleware
  - Migrations / policies: `supabase/migrations/20260206143000_marketplace_module.sql`
  - Validar que `public` endpoints têm políticas de leitura seguras (`marketplace_public_read.sql`)

- [ ] Confirmar integração analytics / relatórios
  - Endpoint analytics: `apps/web/src/app/api/admin/marketplace/analytics/route.ts`
  - Verificar queries e materialized views no DB (se aplicável)

- [ ] Validar exportação/import (CSV) e edge cases
  - CSV downloads:
    - `apps/web/src/components/admin/marketplace/PartnersTable.tsx`
    - `apps/web/src/components/admin/marketplace/DiscountsTable.tsx`
    - `apps/web/src/components/admin/marketplace/TransactionsTable.tsx`
  - Hook relacionado: `apps/web/src/hooks/useExportacoes.ts`

- [ ] Documentação operacional e deploy (confirmar passos)
  - Docs existentes: `docs/API.md`, `apps/web/docs/DATABASE.md`, `PLANEJAMENTO_ADMIN_SPRINTS.md`
  - Adicionar instruções de configuração de gateway de pagamentos e webhooks

- [ ] Testes unitários e lint focados em marketplace
  - Verificar `apps/web/src/hooks/useMarketplace.ts` e cobrir com unit tests

---

## Links rápidos (arquivos relevantes)

- Schema / migrations:
  - `supabase/migrations/20260206143000_marketplace_module.sql`
  - `supabase/migrations/20260207120000_marketplace_public_read.sql`

- APIs:
  - `apps/web/src/app/api/admin/marketplace/partners/route.ts`
  - `apps/web/src/app/api/admin/marketplace/partners/[id]/route.ts`
  - `apps/web/src/app/api/admin/marketplace/discounts/route.ts`
  - `apps/web/src/app/api/admin/marketplace/discounts/[id]/route.ts`
  - `apps/web/src/app/api/admin/marketplace/transactions/route.ts`
  - `apps/web/src/app/api/admin/marketplace/analytics/route.ts`
  - `apps/web/src/app/api/marketplace/discounts/route.ts`
  - `apps/web/src/app/api/marketplace/discounts/[id]/purchase/route.ts`

- Frontend / Components:
  - `apps/web/src/app/admin/marketplace/page.tsx`
  - `apps/web/src/app/admin/marketplace/partners/page.tsx`
  - `apps/web/src/app/admin/marketplace/discounts/page.tsx`
  - `apps/web/src/app/admin/marketplace/transactions/page.tsx`
  - `apps/web/src/components/admin/marketplace/PartnersTable.tsx`
  - `apps/web/src/components/admin/marketplace/DiscountsTable.tsx`
  - `apps/web/src/components/admin/marketplace/TransactionsTable.tsx`
  - `apps/web/src/components/admin/marketplace/MarketplaceDashboard.tsx`

- Hooks / Logic:
  - `apps/web/src/hooks/useMarketplace.ts`
  - `apps/web/src/hooks/useExportacoes.ts`

- Auth / Middleware / RLS:
  - `apps/web/middleware.ts`
  - `supabase/migrations/20260206143000_marketplace_module.sql` (policies)

- Docs / Deploy:
  - `docs/API.md`
  - `apps/web/docs/DATABASE.md`
  - `PLANEJAMENTO_ADMIN_SPRINTS.md`

---

## Sugestão de próximo passo (opcional)

- Criar um branch `chore/sprint2-marketplace-todos` com este ficheiro e abrir um PR com a checklist para assignar responsáveis por item.

---

_Gerado automaticamente pelo script de auditoria de Sprint (review de arquivos do repositório)._
