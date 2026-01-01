-- Script simplificado para testar RLS das tabelas AI
-- Versix Norma - Sprint 2 - Testes de Segurança

DO $$
DECLARE
    test_count INTEGER := 0;
    passed_count INTEGER := 0;
    failed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🧪 Iniciando testes de segurança RLS - Módulo AI';
    RAISE NOTICE '================================================';

    -- Teste 1: Verificar se RLS está habilitado nas tabelas AI
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname IN ('documents', 'document_chunks', 'norma_chat_logs')
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: RLS habilitado nas tabelas AI', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: RLS não habilitado em algumas tabelas AI', test_count;
        END IF;
    END;

    -- Teste 2: Verificar se existem políticas RLS para documents
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'documents' AND schemaname = 'public'
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: Políticas RLS existem para documents', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: Nenhuma política RLS para documents', test_count;
        END IF;
    END;

    -- Teste 3: Verificar se existem políticas RLS para document_chunks
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'document_chunks' AND schemaname = 'public'
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: Políticas RLS existem para document_chunks', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: Nenhuma política RLS para document_chunks', test_count;
        END IF;
    END;

    -- Teste 4: Verificar se existem políticas RLS para norma_chat_logs
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'norma_chat_logs' AND schemaname = 'public'
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: Políticas RLS existem para norma_chat_logs', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: Nenhuma política RLS para norma_chat_logs', test_count;
        END IF;
    END;

    -- Teste 5: Verificar isolamento por condominio_id
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename IN ('documents', 'document_chunks', 'norma_chat_logs')
            AND schemaname = 'public'
            AND policyname LIKE '%condominio%'
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: Políticas incluem isolamento por condominio_id', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: Políticas podem não isolar por condominio_id', test_count;
        END IF;
    END;

    -- Teste 6: Verificar se pgvector extension está disponível
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: Extensão pgvector está instalada', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: Extensão pgvector não encontrada', test_count;
        END IF;
    END;

    -- Teste 7: Verificar se função de busca vetorial existe
    BEGIN
        test_count := test_count + 1;
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE p.proname = 'search_document_chunks'
            AND n.nspname = 'public'
        ) THEN
            passed_count := passed_count + 1;
            RAISE NOTICE '✅ Teste % PASSED: Função search_document_chunks existe', test_count;
        ELSE
            failed_count := failed_count + 1;
            RAISE NOTICE '❌ Teste % FAILED: Função search_document_chunks não encontrada', test_count;
        END IF;
    END;

    -- Resultado final
    RAISE NOTICE '================================================';
    RAISE NOTICE '📊 RESULTADO DOS TESTES:';
    RAISE NOTICE '   Total: % testes', test_count;
    RAISE NOTICE '   Aprovados: % ✅', passed_count;
    RAISE NOTICE '   Reprovados: % ❌', failed_count;

    IF failed_count = 0 THEN
        RAISE NOTICE '🎉 Todos os testes passaram! Segurança RLS está OK.';
    ELSE
        RAISE NOTICE '⚠️  Alguns testes falharam. Verificar configurações de segurança.';
    END IF;

END $$;
