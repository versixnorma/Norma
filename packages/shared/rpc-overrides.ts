// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPCs não-geradas usam `as any` no nome da função (padrão do projeto)
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import type { RpcExtensions } from './database-rpc-extensions';

type BaseClient = SupabaseClient<Database>;

// ─── RPCs nativas (supabase gen types já infere corretamente) ───────────────

export async function rpcContarNaoLidas(client: BaseClient, userId: string) {
  return client.rpc('contar_nao_lidas', { p_usuario_id: userId });
}

export async function rpcConfirmarLeitura(
  client: BaseClient,
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

export async function rpcMarcarTodasLidas(client: BaseClient, userId: string) {
  return client.rpc('marcar_todas_lidas', { p_usuario_id: userId });
}

// ─── encerrar_assembleia: presente nos tipos gerados, Args compatíveis ───────

export async function rpcEncerrarAssembleia(client: BaseClient, assembleiaId: string) {
  return client.rpc('encerrar_assembleia', { p_assembleia_id: assembleiaId });
}

// ─── enviar_notificacao: presente nos tipos gerados mas com interface
//     parcialmente incompatível (p_tipo: string vs enum). Cast documentado. ──

export interface EnviarNotificacaoArgs {
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

export async function rpcEnviarNotificacao(client: BaseClient, args: EnviarNotificacaoArgs) {
  return client.rpc(
    'enviar_notificacao',
    args as unknown as Database['public']['Functions']['enviar_notificacao']['Args']
  );
}

// ─── registrar_push_token: presente nos tipos gerados mas gerador exige
//     p_usuario_id que é derivado do auth na função SQL. Cast documentado. ───

export interface RegistrarPushTokenArgs {
  p_token: string;
  p_provider?: string;
}

export async function rpcRegistrarPushToken(client: BaseClient, args: RegistrarPushTokenArgs) {
  return client.rpc(
    'registrar_push_token',
    args as unknown as Database['public']['Functions']['registrar_push_token']['Args']
  );
}

// ─── RPCs ausentes no gerador — `as any` APENAS no nome da RPC ───────────────
// Padrão documentado do projeto para table/RPC names não presentes nos tipos gerados.
// Os args permanecem fortemente tipados via RpcExtensions.

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function rpcRemoverPushToken(client: BaseClient, token: string) {
  return client.rpc('remover_fcm_token' as any, {
    p_token: token,
  } satisfies RpcExtensions['remover_fcm_token']['Args']);
}

export async function rpcConvocarAssembleia(client: BaseClient, assembleiaId: string) {
  return client.rpc('convocar_assembleia' as any, {
    p_assembleia_id: assembleiaId,
  } satisfies RpcExtensions['convocar_assembleia']['Args']);
}

export async function rpcIniciarAssembleia(client: BaseClient, assembleiaId: string) {
  return client.rpc('iniciar_assembleia' as any, {
    p_assembleia_id: assembleiaId,
  } satisfies RpcExtensions['iniciar_assembleia']['Args']);
}

export async function rpcRetentarWebhook(client: BaseClient, entregaId: string) {
  return client.rpc('retentar_webhook' as any, {
    p_entrega_id: entregaId,
  } satisfies RpcExtensions['retentar_webhook']['Args']);
}

export async function rpcSetAppUserId(client: BaseClient, userId: string) {
  return client.rpc('set_app_user_id' as any, {
    user_id: userId,
  } satisfies RpcExtensions['set_app_user_id']['Args']);
}

export async function rpcMarketplacePurchase(
  client: BaseClient,
  args: RpcExtensions['marketplace_purchase']['Args']
) {
  return client.rpc('marketplace_purchase' as any, args);
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── View queries (views não-geradas pelo supabase gen types) ────────────────

export function queryNotificacoesDashboard(client: BaseClient, condominioId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)
    .from('v_notificacoes_dashboard')
    .select('*')
    .eq('condominio_id', condominioId);
}

// Re-exportar Json para compatibilidade com importações legadas
export type { Json };
export type MarketplacePurchaseArgs = RpcExtensions['marketplace_purchase']['Args'];
