// ============================================
// VERSIX NORMA - Edge Function: validate-ata
// ============================================
// SuperAdmin valida ou rejeita ata de eleição de síndico
// Ao aprovar, ativa o síndico e vincula ao condomínio
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

interface ValidateAtaRequest {
  ata_id: string;
  acao: 'approve' | 'reject';
  motivo_rejeicao?: string;
  condominio_id?: string; // Obrigatório se for novo condomínio
}

interface ValidateAtaResponse {
  success: boolean;
  ata: {
    id: string;
    status: string;
    titulo: string;
  } | null;
  sindico: {
    id: string;
    nome: string;
    email: string;
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

    // Verificar se é SuperAdmin
    const supabase = getSupabaseClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Sessão inválida');
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: adminUser } = await supabaseAdmin
      .from('usuarios')
      .select('id, role, status, nome')
      .eq('auth_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'superadmin' || adminUser.status !== 'active') {
      return forbiddenResponse('Apenas SuperAdmin pode validar atas');
    }

    // Parsear request
    const body: ValidateAtaRequest = await req.json();
    const { ata_id, acao, motivo_rejeicao, condominio_id } = body;

    // Validações
    if (!ata_id) {
      return errorResponse('ID da ata é obrigatório');
    }

    if (!['approve', 'reject'].includes(acao)) {
      return errorResponse('Ação deve ser "approve" ou "reject"');
    }

    if (acao === 'reject' && (!motivo_rejeicao || motivo_rejeicao.length < 20)) {
      return errorResponse('Motivo da rejeição é obrigatório (mínimo 20 caracteres)');
    }

    // Buscar ata
    const { data: ata, error: ataError } = await supabaseAdmin
      .from('atas_validacao')
      .select('*, created_by')
      .eq('id', ata_id)
      .single();

    if (ataError || !ata) {
      return errorResponse('Ata não encontrada', 404);
    }

    if (ata.status !== 'pendente_validacao' && ata.status !== 'rascunho') {
      return errorResponse(`Ata não pode ser validada (status atual: ${ata.status})`);
    }

    // Buscar usuário que criou a ata (candidato a síndico)
    const { data: candidato } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', ata.created_by)
      .single();

    if (!candidato) {
      return errorResponse('Usuário associado à ata não encontrado');
    }

    if (acao === 'approve') {
      // Validar condominio_id para aprovação
      const finalCondominioId = condominio_id || ata.condominio_id;

      if (!finalCondominioId) {
        return errorResponse('ID do condomínio é obrigatório para aprovação');
      }

      // Verificar se condomínio existe
      const { data: condo } = await supabaseAdmin
        .from('condominios')
        .select('id, nome')
        .eq('id', finalCondominioId)
        .single();

      if (!condo) {
        return errorResponse('Condomínio não encontrado');
      }

      // Atualizar ata
      await supabaseAdmin
        .from('atas_validacao')
        .update({
          status: 'validada',
          validado_por: adminUser.id,
          validado_em: new Date().toISOString(),
          condominio_id: finalCondominioId,
        })
        .eq('id', ata_id);

      // Ativar síndico
      await supabaseAdmin
        .from('usuarios')
        .update({
          status: 'active',
          role: 'sindico',
          condominio_id: finalCondominioId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidato.id);

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        usuario_id: adminUser.id,
        condominio_id: finalCondominioId,
        acao: 'ATA_APPROVED',
        tabela: 'atas_validacao',
        registro_id: ata_id,
        dados_depois: {
          ata_titulo: ata.titulo,
          sindico_nome: candidato.nome,
          sindico_email: candidato.email,
          aprovado_por: adminUser.nome,
        },
      });

      return jsonResponse<ValidateAtaResponse>({
        success: true,
        ata: {
          id: ata.id,
          status: 'validada',
          titulo: ata.titulo,
        },
        sindico: {
          id: candidato.id,
          nome: candidato.nome,
          email: candidato.email,
        },
        error: null,
      });
    } else {
      // Rejeitar ata
      await supabaseAdmin
        .from('atas_validacao')
        .update({
          status: 'rejeitada',
          validado_por: adminUser.id,
          validado_em: new Date().toISOString(),
          motivo_rejeicao,
        })
        .eq('id', ata_id);

      // Audit log
      await supabaseAdmin.from('audit_logs').insert({
        usuario_id: adminUser.id,
        condominio_id: ata.condominio_id,
        acao: 'ATA_REJECTED',
        tabela: 'atas_validacao',
        registro_id: ata_id,
        dados_depois: {
          ata_titulo: ata.titulo,
          candidato_nome: candidato.nome,
          motivo_rejeicao,
          rejeitado_por: adminUser.nome,
        },
      });

      return jsonResponse<ValidateAtaResponse>({
        success: true,
        ata: {
          id: ata.id,
          status: 'rejeitada',
          titulo: ata.titulo,
        },
        sindico: null,
        error: null,
      });
    }
  } catch (error) {
    console.error('Erro na validação de ata:', error);
    return errorResponse('Erro interno', 500);
  }
});
