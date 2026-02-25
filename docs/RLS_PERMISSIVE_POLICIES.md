# Políticas RLS Permissivas — Documentação de Segurança

4 políticas usam `USING (true)` intencionalmente.

## rate_limit_requests (2 políticas)

- **Migration:** `20260203000002_implement_rate_limiting.sql`
- **SELECT + INSERT com `USING(true)` / `WITH CHECK(true)`**
- **Justificativa:** Rate limiting registra tentativas de QUALQUER origem,
  incluindo requests não-autenticados. A tabela contém apenas contadores
  efêmeros (ip, endpoint, count, window_start).
- **Mitigação:** Dados são limpos automaticamente pela função
  `cleanup_rate_limits()`. Nenhum dado sensível exposto.

## condominios (2 políticas)

- **Migration:** `20240101000004_create_rls_policies.sql:228-229`
- **SELECT com `USING(true)` / `WITH CHECK(true)` para service_role**
- **Justificativa:** Fluxo de signup requer listagem de condomínios antes
  da autenticação. A API `/api/condominios` é GET-only.
- **Mitigação:** Apenas nome e ID são expostos. Dados financeiros e pessoais
  estão em tabelas separadas com RLS restritivo.

## Próxima Revisão

Após launch: avaliar se signup pode usar API key ao invés de acesso
público para reduzir superfície de exposição.
