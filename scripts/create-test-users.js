#!/usr/bin/env node

/**
 * Script para criar usuários de teste no Supabase Auth
 * Execute: node scripts/create-test-users.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL não encontrada!');
  console.error('Verifique se a variável está definida em .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  console.error('Esta chave é necessária para criar usuários via API admin.');
  console.error('');
  console.error('Para obtê-la:');
  console.error('1. Acesse https://supabase.com/dashboard/project/udryfalkvulhzoahgvqc/settings/api');
  console.error('2. Copie a "service_role" key');
  console.error('3. Adicione ao .env.local: SUPABASE_SERVICE_ROLE_KEY="sua-chave-aqui"');
  console.error('');
  console.error('Ou crie os usuários manualmente no Dashboard do Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Usuários de teste baseados no seed data
const testUsers = [
  {
    email: 'sindico@aurora.demo',
    password: 'demo123456',
    nome: 'Carlos Silva',
    role: 'sindico',
    userId: '55555555-5555-5555-5555-555555555501'
  },
  {
    email: 'morador@aurora.demo',
    password: 'demo123456',
    nome: 'Maria Santos',
    role: 'morador',
    userId: '55555555-5555-5555-5555-555555555502'
  },
  {
    email: 'porteiro@aurora.demo',
    password: 'demo123456',
    nome: 'José Oliveira',
    role: 'porteiro',
    userId: '55555555-5555-5555-5555-555555555503'
  },
  {
    email: 'admin@versix.com.br',
    password: 'admin123456',
    nome: 'Administrador Versix',
    role: 'superadmin',
    userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' // UUID gerado para admin
  }
];

async function createUser(user) {
  try {
    console.log(`\n👤 Criando usuário: ${user.email}`);

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        nome: user.nome,
        role: user.role
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  Usuário ${user.email} já existe, pulando...`);
        return true;
      }
      throw authError;
    }

    const authId = authData.user.id;
    console.log(`✅ Usuário criado no Auth: ${authId}`);

    // Atualizar o registro na tabela usuarios com o auth_id
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ auth_id: authId })
      .eq('id', user.userId);

    if (updateError) {
      console.error(`❌ Erro ao atualizar tabela usuarios:`, updateError);
      return false;
    }

    console.log(`✅ Tabela usuarios atualizada com auth_id`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao criar usuário ${user.email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando criação de usuários de teste...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const user of testUsers) {
    const success = await createUser(user);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`✅ Usuários criados com sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n🔑 Credenciais de teste:');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });

    console.log('\n💡 Você pode fazer login com qualquer uma dessas contas!');
  }

  if (errorCount > 0) {
    console.log('\n⚠️  Alguns usuários podem já existir. Tente fazer login com as credenciais acima.');
  }
}

main().catch(console.error);
