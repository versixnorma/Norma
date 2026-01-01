// ============================================
// VERSIX NORMA - Edge Function: approve-user
// ============================================
// Síndico aprova ou rejeita morador pendente
// Também permite SuperAdmin aprovar qualquer usuário
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

interface ApproveUserRequest {
  usuario_id: string;
  acao: 'approve' | 'reject';
  unidade_id?: string; // Obrigatório para aprovação
  motivo_rejeicao?: string; // Obrigatório para rejeição
}

interface ApproveUserResponse {
  success: boolean;
  usuario: {
    id: string;
    nome: string;
    email: string;
    status: string;
    unidade_id: string | null;
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

    const supabase = getSupabaseClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Sessão inválida');
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Buscar dados do usuário logado
    const { data: currentUser } = await supabaseAdmin
      .from('usuarios')
      .select('id, role, status, condominio_id, nome')
      .eq('auth_id', user.id)
      .single();

    if (!currentUser || currentUser.status !== 'active') {
      return forbiddenResponse('Usuário não está ativo');
    }

    // Verificar permissão (SuperAdmin ou Síndico)
    const isSuperAdmin = currentUser.role === 'superadmin';
    const isSindico = ['sindico', 'subsindico', 'admin_condo'].includes(currentUser.role);

    if (!isSuperAdmin && !isSindico) {
      return forbiddenResponse('Apenas Síndico ou SuperAdmin podem aprovar usuários');
    }

    // Parsear request
    const body: ApproveUserRequest = await req.json();
    const { usuario_id, acao, unidade_id, motivo_rejeicao } = body;

    // Validações
    if (!usuario_id) {
      return errorResponse('ID do usuário é obrigatório');
    }

    if (!['approve', 'reject'].includes(acao)) {
      return errorResponse('Ação deve ser "approve" ou "reject"');
    }

    if (acao === 'reject' && !motivo_rejeicao) {
      return errorResponse('Motivo da rejeição é obrigatório');
    }

    // Buscar usuário a ser aprovado
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', usuario_id)
      .single();

    if (targetError || !targetUser) {
      return errorResponse('Usuário não encontrado', 404);
    }

    // Verificar se está pendente
    if (targetUser.status !== 'pending') {
      return errorResponse(`Usuário não está pendente (status: ${targetUser.status})`);
    }

    // Se não é SuperAdmin, verificar se é do mesmo condomínio
    if (!isSuperAdmin && targetUser.condominio_id !== currentUser.condominio_id) {
      return forbiddenResponse('Você só pode aprovar usuários do seu condomínio');
    }

    if (acao === 'approve') {
      // Para aprovação, unidade_id é recomendado mas não obrigatório
      const finalUnidadeId = unidade_id || targetUser.unidade_id;

      // Se forneceu unidade_id, verificar se pertence ao condomínio
      if (finalUnidadeId) {
        const { data: unidade } = await supabaseAdmin
          .from('unidades_habitacionais')
          .select('id, condominio_id, numero')
          .eq('id', finalUnidadeId)
          .single();

        if (!unidade) {
          return errorResponse('Unidade não encontrada');
        }

        if (unidade.condominio_id !== targetUser.condominio_id) {
          return errorResponse('Unidade não pertence ao condomínio do usuário');
        }
      }

      // Aprovar usuário
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({
          status: 'active',
          unidade_id: finalUnidadeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario_id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao aprovar:', updateError);
        return errorResponse('Erro ao aprovar usuário', 500);
      }

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        usuario_id: currentUser.id,
        condominio_id: targetUser.condominio_id,
        acao: 'USER_APPROVED',
        tabela: 'usuarios',
        registro_id: usuario_id,
        dados_antes: { status: 'pending' },
        dados_depois: {
          status: 'active',
          aprovado_por: currentUser.nome,
          unidade_id: finalUnidadeId,
        },
      });

      return jsonResponse<ApproveUserResponse>({
        success: true,
        usuario: {
          id: updatedUser.id,
          nome: updatedUser.nome,
          email: updatedUser.email,
          status: updatedUser.status,
          unidade_id: updatedUser.unidade_id,
        },
        error: null,
      });
    } else {
      // Rejeitar usuário (soft delete)
      await supabaseAdmin
        .from('usuarios')
        .update({
          status: 'removed',
          deleted_at: new Date().toISOString(),
          deleted_reason: motivo_rejeicao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario_id);

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        usuario_id: currentUser.id,
        condominio_id: targetUser.condominio_id,
        acao: 'USER_REJECTED',
        tabela: 'usuarios',
        registro_id: usuario_id,
        dados_antes: { status: 'pending' },
        dados_depois: {
          status: 'removed',
          rejeitado_por: currentUser.nome,
          motivo: motivo_rejeicao,
        },
      });

      return jsonResponse<ApproveUserResponse>({
        success: true,
        usuario: {
          id: targetUser.id,
          nome: targetUser.nome,
          email: targetUser.email,
          status: 'removed',
          unidade_id: null,
        },
        error: null,
      });
    }
  } catch (error) {
    console.error('Erro na aprovação:', error);
    return errorResponse('Erro interno', 500);
  }
});
