// Utilitários para criação e remoção de usuário de teste para Playwright
// Roadmap: apps/web/tests/utils/testUserUtils.ts

// Força o carregamento do .env.local para Playwright
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Defina aqui o ID de um condomínio válido já existente no banco para os testes
const CONDOMINIO_ID = process.env.TEST_CONDOMINIO_ID || 'test-condominio-id';

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
}
