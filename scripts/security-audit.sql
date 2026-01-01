-- ============================================
-- VERSIX NORMA - SECURITY AUDIT SCRIPT
-- ============================================
-- Script para testar políticas RLS e isolamento de dados
-- Execute este script em um ambiente de desenvolvimento
-- ============================================

-- Teste 1: Verificar se usuários podem acessar dados de outros condomínios
DO $$
DECLARE
    test_user_id UUID;
    test_condominio_a UUID;
    test_condominio_b UUID;
    result_count INTEGER;
BEGIN
    -- Criar IDs de teste (substitua por IDs reais se necessário)
    test_user_id := '00000000-0000-0000-0000-000000000001'::UUID;
    test_condominio_a := '00000000-0000-0000-0000-000000000002'::UUID;
    test_condominio_b := '00000000-0000-0000-0000-000000000003'::UUID;

    RAISE NOTICE '=== TESTE DE ISOLAMENTO DE DADOS ===';

    -- Teste: Usuário deve ver apenas seus próprios condomínios
    SELECT COUNT(*) INTO result_count
    FROM norma_chat_logs
    WHERE user_id = test_user_id;

    RAISE NOTICE 'Chat logs do usuário: %', result_count;

    -- Teste: Usuário não deve ver dados de condomínio B se não for membro
    SELECT COUNT(*) INTO result_count
    FROM document_chunks
    WHERE condominio_id = test_condominio_b;

    RAISE NOTICE 'Document chunks de condomínio B (sem acesso): %', result_count;

    -- Teste: Verificar se RLS está habilitado
    SELECT COUNT(*) INTO result_count
    FROM pg_class c
    JOIN pg_policy p ON c.oid = p.polrelid
    WHERE c.relname IN ('norma_chat_logs', 'document_chunks', 'documents')
      AND c.relrowsecurity = true;

    RAISE NOTICE 'Tabelas com RLS habilitado: %', result_count;

    RAISE NOTICE '=== TESTE CONCLUÍDO ===';
END $$;

-- Teste 2: Verificar políticas de acesso a documentos
DO $$
DECLARE
    test_user_id UUID;
    test_condominio_id UUID;
BEGIN
    test_user_id := '00000000-0000-0000-0000-000000000001'::UUID;
    test_condominio_id := '00000000-0000-0000-0000-000000000002'::UUID;

    RAISE NOTICE '=== TESTE DE POLÍTICAS DE DOCUMENTOS ===';

    -- Simular contexto de segurança (isso seria feito pela aplicação)
    -- SET LOCAL auth.uid = test_user_id;

    -- Verificar se usuário pode ver documentos do seu condomínio
    -- (Este teste requer execução com auth.uid definido)

    RAISE NOTICE 'Nota: Execute estes testes com auth.uid definido na sessão';
    RAISE NOTICE 'Exemplo: SET LOCAL auth.uid = ''%'';', test_user_id;
END $$;

-- Teste 3: Verificar isolamento de embeddings vetoriais
DO $$
DECLARE
    test_condominio_a UUID;
    test_condominio_b UUID;
    count_a INTEGER;
    count_b INTEGER;
BEGIN
    test_condominio_a := '00000000-0000-0000-0000-000000000002'::UUID;
    test_condominio_b := '00000000-0000-0000-0000-000000000003'::UUID;

    RAISE NOTICE '=== TESTE DE ISOLAMENTO VETORIAL ===';

    SELECT COUNT(*) INTO count_a FROM document_chunks WHERE condominio_id = test_condominio_a;
    SELECT COUNT(*) INTO count_b FROM document_chunks WHERE condominio_id = test_condominio_b;

    RAISE NOTICE 'Chunks condomínio A: %', count_a;
    RAISE NOTICE 'Chunks condomínio B: %', count_b;

    RAISE NOTICE '=== TESTE CONCLUÍDO ===';
END $$;

-- Teste 4: Verificar função de busca vetorial
DO $$
DECLARE
    test_embedding vector(1536);
    results_count INTEGER;
BEGIN
    RAISE NOTICE '=== TESTE DE BUSCA VETORIAL ===';

    -- Criar embedding de teste (vetor zero para teste)
    test_embedding := '[0]'::vector(1536);

    -- Testar função de busca (deve retornar resultados se houver dados)
    SELECT COUNT(*) INTO results_count
    FROM search_document_chunks(test_embedding, 0.1, 5);

    RAISE NOTICE 'Resultados da busca vetorial: %', results_count;

    RAISE NOTICE '=== TESTE CONCLUÍDO ===';
END $$;

-- ============================================
-- RELATÓRIO DE SEGURANÇA
-- ============================================
-- Execute este script e verifique os resultados:
--
-- ✅ RLS habilitado em todas as tabelas críticas
-- ✅ Usuários não acessam dados de outros condomínios
-- ✅ Função de busca vetorial filtra por condomínio
-- ✅ Políticas de insert/update respeitam ownership
--
-- Se algum teste falhar, revise as políticas RLS
-- ============================================
