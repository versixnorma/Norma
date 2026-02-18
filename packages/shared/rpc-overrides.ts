import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';

type TypedClient = SupabaseClient<Database>;

export async function rpcContarNaoLidas(client: TypedClient, userId: string) {
  return client.rpc('contar_nao_lidas', { p_usuario_id: userId });
}

export async function rpcConfirmarLeitura(
  client: TypedClient,
  notificacaoId: string,
  userId: string,
  canal: 'push' | 'email' | 'whatsapp' | 'sms' | 'voz' | 'in_app' | 'mural' = 'in_app'
) {
  return client.rpc('confirmar_leitura', {
    p_canal: canal,
    p_notificacao_id: notificacaoId,
    p_usuario_id: userId,
  });
}

export async function rpcMarcarTodasLidas(client: TypedClient, userId: string) {
  return client.rpc('marcar_todas_lidas', { p_usuario_id: userId });
}

interface EnviarNotificacaoArgs {
  p_condominio_id: string;
  p_tipo: string;
  p_titulo: string;
  p_corpo: string;
  p_prioridade?: 'baixa' | 'normal' | 'alta' | 'critica';
  p_destinatarios_tipo?: string;
  p_destinatarios_filtro?: Json;
  p_referencia_tipo?: string;
  p_referencia_id?: string;
  p_gerar_mural?: boolean;
  p_criado_por: string;
}

export async function rpcEnviarNotificacao(client: TypedClient, args: EnviarNotificacaoArgs) {
  return client.rpc('enviar_notificacao' as never, args as never);
}

export function queryNotificacoesDashboard(client: TypedClient, condominioId: string) {
  return client
    .from('v_notificacoes_dashboard' as never)
    .select('*')
    .eq('condominio_id', condominioId);
}

interface RegistrarPushTokenArgs {
  p_token: string;
  p_provider?: string;
}

export async function rpcRegistrarPushToken(client: TypedClient, args: RegistrarPushTokenArgs) {
  return client.rpc('registrar_push_token' as never, args as never);
}

export async function rpcRemoverPushToken(client: TypedClient, token: string) {
  return client.rpc('remover_fcm_token' as never, { p_token: token } as never);
}

export async function rpcConvocarAssembleia(client: TypedClient, assembleiaId: string) {
  return client.rpc('convocar_assembleia' as never, { p_assembleia_id: assembleiaId } as never);
}

export async function rpcIniciarAssembleia(client: TypedClient, assembleiaId: string) {
  return client.rpc('iniciar_assembleia' as never, { p_assembleia_id: assembleiaId } as never);
}

export async function rpcEncerrarAssembleia(client: TypedClient, assembleiaId: string) {
  return client.rpc('encerrar_assembleia' as never, { p_assembleia_id: assembleiaId } as never);
}

export async function rpcRetentarWebhook(client: TypedClient, entregaId: string) {
  return client.rpc('retentar_webhook' as never, { p_entrega_id: entregaId } as never);
}

export async function rpcSetAppUserId(client: TypedClient, userId: string) {
  return client.rpc('set_app_user_id' as never, { user_id: userId } as never);
}
