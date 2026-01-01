#!/usr/bin/env node

/**
 * Script simples para diagnosticar problemas de autenticação no Supabase
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://udryfalkvulhzoahgvqc.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcnlmYWxrdnVsaHpvYWhndnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMDU1NjksImV4cCI6MjA4MTg4MTU2OX0.KT-uZUchS43ZiAK54OOFAmSX8TF6HTqsU4Qg6WM927c";

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...');
  console.log('URL:', supabaseUrl);
  console.log('Key presente:', supabaseKey ? '✅' : '❌');
  console.log('');

  try {
    // Teste básico de conectividade com health check
    console.log('🔍 Testando health check da API...');
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Health check status:', healthResponse.status);

    if (healthResponse.status === 200) {
      console.log('✅ API REST funcionando');
    } else {
      console.log('⚠️  API REST pode ter problemas');
      const responseText = await healthResponse.text();
      console.log('Resposta:', responseText);
    }

    // Teste do endpoint de autenticação (sem credenciais)
    console.log('\n🔍 Testando endpoint de autenticação...');
    const authTestResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Auth endpoint status:', authTestResponse.status);

    if (authTestResponse.status === 401) {
      console.log('✅ Auth endpoint responde corretamente (401 esperado sem token)');
    } else {
      console.log('⚠️  Auth endpoint comportamento inesperado');
    }

    // Teste de login com credenciais de teste (vamos usar credenciais claramente inválidas)
    console.log('\n🔍 Testando login com credenciais inválidas (deve falhar)...');
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@invalido.com',
        password: 'senhaerrada'
      })
    });

    console.log('Login test status:', loginResponse.status);

    if (loginResponse.status === 400) {
      console.log('✅ Endpoint de login responde corretamente (400 esperado para credenciais inválidas)');
      const errorData = await loginResponse.json();
      console.log('Erro esperado:', errorData.error_description || errorData.msg);
    } else {
      console.log('⚠️  Comportamento inesperado no login');
    }

  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
  }
}

testConnection();
