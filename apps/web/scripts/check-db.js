const { createClient } = require('@supabase/supabase-js');

// Chaves fornecidas pelo usuário
const SUPABASE_URL = 'https://bhtosfttnucnmjnawbuw.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodG9zZnR0bnVjbm1qbmF3YnV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMyODc5MiwiZXhwIjoyMDgyOTA0NzkyfQ.NdnqaRX2QbRoxVhv0QEYIbNgFDVKA8kzBAJZcABQTA0';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('Verificando conexão com:', SUPABASE_URL);

  // Tenta acessar uma tabela core do sistema, ex: 'usuarios' ou 'assembleias'
  const { data, error } = await supabase.from('assembleias').select('id').limit(1);

  if (error) {
    if (error.code === '42P01') {
      // undefined_table
      console.log('STATUS: TABELAS NÃO EXISTEM (Banco Vazio)');
    } else {
      console.log('STATUS: ERRO DE CONEXÃO OU OUTRO:', error.message);
    }
  } else {
    console.log('STATUS: TABELAS EXISTEM (Sucesso)');
  }
}

checkTables();
