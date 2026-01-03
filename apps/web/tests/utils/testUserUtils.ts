// Utilitários para criação e remoção de usuário de teste para Playwright
// Roadmap: apps/web/tests/utils/testUserUtils.ts

// Força o carregamento do .env.local para Playwright
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Defina aqui o ID de um condomínio válido já existente no banco para os testes
const CONDOMINIO_ID = process.env.TEST_CONDOMINIO_ID || '00000000-0000-0000-0000-000000000001';

async function ensureTestCondominio() {
  const { data } = await supabase.from('condominios').select('id').eq('id', CONDOMINIO_ID).single();

  if (!data) {
    console.log(`[TestUtils] Criando condomínio de teste ${CONDOMINIO_ID}...`);
    // Create dummy address if needed by constraints, usually text fields are nullable or simple
    const { error } = await supabase.from('condominios').insert({
      id: CONDOMINIO_ID,
      nome: 'Condomínio de Teste E2E',
      endereco: 'Rua dos Testes, 123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01001-000',
      total_unidades: 10,
      telefone: '11999999999',
    });

    if (error) {
      // Ignore duplicate key error if race condition
      if (!error.message.includes('duplicate key')) {
        console.error('[TestUtils] Erro ao criar condomínio:', error);
        throw error;
      }
    }
  }
}

export async function createTestUser(): Promise<{
  id: string;
  email: string;
  password: string;
  nome: string;
  condominio_id: string;
}> {
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'Test@1234';
  const nome = 'Test User';

  // Garante que o condomínio existe
  await ensureTestCondominio();

  // Cria usuário de autenticação
  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !user?.user) throw error || new Error('Erro ao criar usuário');

  // Cria perfil e vínculo com condomínio
  await supabase.from('usuarios').insert({
    auth_id: user.user.id,
    nome,
    email,
    status: 'ativo',
  });
  await supabase.from('usuario_condominios').insert({
    auth_id: user.user.id,
    condominio_id: CONDOMINIO_ID,
    status: 'ativo',
  });

  return { id: user.user.id, email, password, nome, condominio_id: CONDOMINIO_ID };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await supabase.auth.admin.deleteUser(userId);
  await supabase.from('usuarios').delete().eq('auth_id', userId);
  await supabase.from('usuario_condominios').delete().eq('auth_id', userId);
  // Opcional: Não deletamos o condomínio para não afetar outros testes rodando em paralelo
  // await supabase.from('condominios').delete().eq('id', CONDOMINIO_ID);
}
