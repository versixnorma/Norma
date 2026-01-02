const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local if possible, or use hardcoded if necessary (assuming user env is robust)
// Using same hardcoded approach as check-db.js for reliability since we saw issues reading .env.local directly via tool
const SUPABASE_URL = 'https://bhtosfttnucnmjnawbuw.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodG9zZnR0bnVjbm1qbmF3YnV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMyODc5MiwiZXhwIjoyMDgyOTA0NzkyfQ.NdnqaRX2QbRoxVhv0QEYIbNgFDVKA8kzBAJZcABQTA0';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EXPECTED_TABLES = [
  // Core (002)
  'condominios',
  'blocos',
  'unidades_habitacionais',
  'usuarios',
  'comunicados',
  'audit_logs',
  'sessoes_impersonate',
  'atas_validacao',
  'feature_flags',
  'rate_limits',

  // Operational (006)
  'ocorrencias',
  'ocorrencias_historico',
  'chamados',
  'chamados_mensagens',
  'faq',
  'faq_votos',
  'comunicados_leitura',

  // Financial (008)
  'categorias_financeiras',
  'contas_bancarias',
  'contas_bancarias_historico',
  'lancamentos_financeiros',
  'prestacao_contas',
  'taxas_unidades',
  'configuracoes_financeiras',

  // Assembleias (012)
  'assembleias',
  'assembleia_pautas',
  'assembleia_pauta_opcoes',
  'assembleia_presencas',
  'assembleia_votos',
  'assembleia_procuracoes',
  'assembleia_assinaturas',
  'assembleia_logs',
];

const TABLE_COLUMNS_CHECK = {
  comunicados: ['status', 'resumo', 'destaque', 'publicado', 'anexos'],
};

async function audit() {
  console.log('--- INICIANDO AUDITORIA DO BANCO DE DADOS ---');
  console.log(`Target: ${SUPABASE_URL}`);

  const results = {
    missingTables: [],
    existingTables: [],
    columnmismatches: [],
    errors: [],
  };

  for (const table of EXPECTED_TABLES) {
    try {
      // 1. Check Table Existence
      const { error: tableError } = await supabase.from(table).select('id').limit(1);

      if (tableError) {
        if (tableError.code === '42P01') {
          console.log(`[FALTA] Tabela não encontrada: ${table}`);
          results.missingTables.push(table);
        } else {
          console.log(`[ERRO] Falha ao verificar tabela ${table}: ${tableError.message}`);
          results.errors.push({ table, message: tableError.message });
        }
        continue;
      }

      console.log(`[OK] Tabela existe: ${table}`);
      results.existingTables.push(table);

      // 2. Check Specific Columns (if configured)
      if (TABLE_COLUMNS_CHECK[table]) {
        const columns = TABLE_COLUMNS_CHECK[table].join(',');
        const { error: columnError } = await supabase.from(table).select(columns).limit(1);

        if (columnError) {
          console.log(`[ALERTA] Colunas ausentes em ${table}: ${columnError.message}`);
          results.columnmismatches.push({ table, message: columnError.message });
        } else {
          console.log(`[OK] Colunas validadas em ${table}`);
        }
      }
    } catch (err) {
      console.error(`Status check failed for ${table}:`, err);
      results.errors.push({ table, message: err.message });
    }
  }

  console.log('\n--- RESUMO ---');
  console.log(`Total Esperado: ${EXPECTED_TABLES.length}`);
  console.log(`Encontrados: ${results.existingTables.length}`);
  console.log(`Faltando: ${results.missingTables.length}`);

  if (results.missingTables.length > 0) {
    console.log('Tabelas Faltantes:');
    results.missingTables.forEach((t) => console.log(` - ${t}`));
  }

  if (results.columnmismatches.length > 0) {
    console.log('Problemas de Coluna:');
    results.columnmismatches.forEach((c) => console.log(` - ${c.table}: ${c.message}`));
  }

  if (results.missingTables.length === 0 && results.columnmismatches.length === 0) {
    console.log('AUDITORIA APROVADA: Todas as tabelas verificadas existem.');
  } else {
    console.log('AUDITORIA FALHOU: Existem discrepâncias.');
  }
}

audit();
