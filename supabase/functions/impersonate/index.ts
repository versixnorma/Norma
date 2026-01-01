// ============================================
// VERSIX NORMA - Edge Function: impersonate
// ============================================
// Permite SuperAdmin "virar" outro usuário para suporte
// Gera token temporário e registra em audit_log
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  handleCors,
  jsonResponse,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from '../_shared/cors.ts';
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts';

interface ImpersonateRequest {
  usuario_alvo_id: string;
  motivo: string;
}

interface ImpersonateResponse {
  success: boolean;
  sessao_id: string | null;
  expires_at: string | null;
  usuario_alvo: {
    id: string;
    nome: string;
    email: string;
    role: string;
    condominio_id: string | null;
  } | null;
  error: string | null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Apenas POST
  if (req.method !== 'POST') {
    return errorResponse('Método não permitido', 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return unauthorizedResponse();
    }

    // Verificar se usuário logado é SuperAdmin
    const supabase = getSupabaseClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Sessão inválida');
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Buscar dados do SuperAdmin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('usuarios')
      .select('id, role, status, nome')
      .eq('auth_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return unauthorizedResponse('Usuário não encontrado');
    }

    if (adminUser.role !== 'superadmin' || adminUser.status !== 'active') {
      return forbiddenResponse('Apenas SuperAdmin ativo pode usar impersonate');
    }

    // Parsear request
    const body: ImpersonateRequest = await req.json();
    const { usuario_alvo_id, motivo } = body;

    // Validações
    if (!usuario_alvo_id) {
      return errorResponse('ID do usuário alvo é obrigatório');
    }

    if (!motivo || motivo.length < 10) {
      return errorResponse('Motivo é obrigatório (mínimo 10 caracteres)');
    }

    // Buscar usuário alvo
    const { data: alvo, error: alvoError } = await supabaseAdmin
      .from('usuarios')
      .select('id, auth_id, email, nome, role, status, condominio_id')
      .eq('id', usuario_alvo_id)
      .single();

    if (alvoError || !alvo) {
      return errorResponse('Usuário alvo não encontrado', 404);
    }

    // Não pode impersonar outro SuperAdmin
    if (alvo.role === 'superadmin') {
      return forbiddenResponse('Não é possível impersonar outro SuperAdmin');
    }

    // Verificar se usuário alvo está ativo
    if (alvo.status !== 'active') {
      return errorResponse('Usuário alvo não está ativo');
    }

    // Revogar sessões de impersonate anteriores ativas do mesmo admin
    await supabaseAdmin
      .from('sessoes_impersonate')
      .update({ revoked_at: new Date().toISOString() })
      .eq('superadmin_id', adminUser.id)
      .is('revoked_at', null);

    // Criar nova sessão de impersonate
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    const { data: sessao, error: sessaoError } = await supabaseAdmin
      .from('sessoes_impersonate')
      .insert({
        superadmin_id: adminUser.id,
        usuario_alvo_id: alvo.id,
        motivo,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessaoError) {
      console.error('Erro ao criar sessão:', sessaoError);
      return errorResponse('Erro ao criar sessão de impersonate', 500);
    }

    // Registrar no audit_log
    await supabaseAdmin.from('audit_logs').insert({
      usuario_id: adminUser.id,
      condominio_id: alvo.condominio_id,
      acao: 'IMPERSONATE_START',
      tabela: 'sessoes_impersonate',
      registro_id: sessao.id,
      dados_depois: {
        superadmin: adminUser.nome,
        usuario_alvo: alvo.nome,
        motivo,
      },
    });

    return jsonResponse<ImpersonateResponse>({
      success: true,
      sessao_id: sessao.id,
      expires_at: expiresAt.toISOString(),
      usuario_alvo: {
        id: alvo.id,
        nome: alvo.nome,
        email: alvo.email,
        role: alvo.role,
        condominio_id: alvo.condominio_id,
      },
      error: null,
    });
  } catch (error) {
    console.error('Erro no impersonate:', error);
    return errorResponse('Erro interno', 500);
  }
});
