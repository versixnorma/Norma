// ============================================
// VERSIX NORMA - Edge Function: verify-session
// ============================================
// Verifica se a sessão é válida e retorna dados do usuário
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, type AuthUser } from '../_shared/cors.ts';
import { getSupabaseAdmin, getSupabaseClient } from '../_shared/supabase.ts';

interface VerifyResponse {
  valid: boolean;
  user: AuthUser | null;
  redirect: string | null;
  error: string | null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse<VerifyResponse>(
        {
          valid: false,
          user: null,
          redirect: '/login',
          error: 'Token não fornecido',
        },
        401
      );
    }

    // Cliente com token do usuário
    const supabase = getSupabaseClient(authHeader);

    // Verificar sessão
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse<VerifyResponse>(
        {
          valid: false,
          user: null,
          redirect: '/login',
          error: 'Sessão inválida ou expirada',
        },
        401
      );
    }

    // Buscar dados completos do usuário na tabela usuarios
    const supabaseAdmin = getSupabaseAdmin();
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (userError || !usuario) {
      return jsonResponse<VerifyResponse>(
        {
          valid: false,
          user: null,
          redirect: '/completar-cadastro',
          error: 'Perfil não encontrado',
        },
        404
      );
    }

    // Verificar status do usuário
    let redirect: string | null = null;

    if (usuario.status === 'pending') {
      if (usuario.role === 'sindico') {
        redirect = '/aguardando-validacao-ata';
      } else {
        redirect = '/aguardando-aprovacao';
      }
    } else if (usuario.status === 'suspended') {
      return jsonResponse<VerifyResponse>(
        {
          valid: false,
          user: null,
          redirect: '/conta-suspensa',
          error: 'Conta suspensa',
        },
        403
      );
    } else if (usuario.status === 'removed' || usuario.deleted_at) {
      return jsonResponse<VerifyResponse>(
        {
          valid: false,
          user: null,
          redirect: '/login',
          error: 'Conta removida',
        },
        403
      );
    } else if (usuario.status === 'active') {
      // Determinar dashboard baseado no role
      switch (usuario.role) {
        case 'superadmin':
          redirect = '/admin/dashboard';
          break;
        case 'sindico':
        case 'subsindico':
        case 'admin_condo':
          redirect = '/sindico/dashboard';
          break;
        default:
          redirect = '/morador/dashboard';
      }
    }

    // Atualizar último acesso
    await supabaseAdmin
      .from('usuarios')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', usuario.id);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      usuario_id: usuario.id,
      nome: usuario.nome,
      role: usuario.role,
      status: usuario.status,
      condominio_id: usuario.condominio_id,
      unidade_id: usuario.unidade_id,
    };

    return jsonResponse<VerifyResponse>({
      valid: true,
      user: authUser,
      redirect,
      error: null,
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
    return jsonResponse<VerifyResponse>(
      {
        valid: false,
        user: null,
        redirect: '/login',
        error: 'Erro interno',
      },
      500
    );
  }
});
