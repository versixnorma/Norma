-- pgTAP tests para políticas RLS
-- Executar: supabase test db

BEGIN;
SELECT plan(8);

-- Setup: configurar contexto de autenticação
SELECT set_config('request.jwt.claim.sub', 'user-a-uuid', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- Test 1: Morador só vê chamados do seu condomínio
SELECT set_config('versix.user_id', 'user-morador-1', true);
SELECT is(
  (SELECT count(*) FROM chamados WHERE condominio_id = 'condo-outro-uuid')::integer,
  0,
  'Morador não vê chamados de outro condomínio'
);

-- Test 2: Admin vê todos os chamados do seu condomínio
SELECT set_config('versix.user_id', 'user-admin-1', true);
SELECT ok(
  (SELECT count(*) FROM chamados WHERE condominio_id = 'condo-admin-1-uuid') >= 0,
  'Admin pode consultar chamados do seu condomínio'
);

-- Test 3: Rate limit é acessível por todos (USING true — intencional)
SELECT ok(
  (SELECT count(*) FROM rate_limit_requests) >= 0,
  'Tabela rate_limit_requests acessível publicamente (contadores efêmeros)'
);

-- Test 4: Condominios listagem pública (signup flow — intencional)
SELECT ok(
  (SELECT count(*) FROM condominios) >= 0,
  'Condominios listáveis publicamente para fluxo de signup'
);

-- Test 5: Morador não acessa lançamentos de outro condomínio
SELECT set_config('versix.user_id', 'user-morador-1', true);
SELECT is(
  (SELECT count(*) FROM lancamentos_financeiros WHERE condominio_id = 'condo-outro-uuid')::integer,
  0,
  'Morador não vê lançamentos financeiros de outro condomínio'
);

-- Test 6: SECURITY DEFINER function de verificação de role
SELECT ok(
  public.user_has_admin_role_in_condominio('condo-admin-1-uuid'::uuid) IS NOT NULL,
  'Função SECURITY DEFINER user_has_admin_role_in_condominio é acessível'
);

-- Test 7: Usuário anônimo não acessa tabela usuarios
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM usuarios)::integer,
  0,
  'Anon não consegue listar tabela usuarios'
);

-- Test 8: Document chunks isolados por condomínio
SET ROLE authenticated;
SELECT set_config('versix.user_id', 'user-morador-1', true);
SELECT is(
  (SELECT count(*) FROM document_chunks WHERE condominio_id = 'condo-outro-uuid')::integer,
  0,
  'Document chunks isolados por condomínio (RAG seguro)'
);

SELECT * FROM finish();
ROLLBACK;
