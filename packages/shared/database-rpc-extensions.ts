// packages/shared/database-rpc-extensions.ts
// Tipos manuais para RPCs ausentes no `supabase gen types`.
// IMPORTANTE: Manter sincronizado com migrations. CI valida via audit-types.sh.
//
// Funções JÁ presentes em database.types.ts (não incluídas aqui):
//   - enviar_notificacao, registrar_push_token, encerrar_assembleia
//
// Funções AUSENTES no gerador (definidas aqui e usadas em rpc-overrides.ts):
//   - convocar_assembleia, iniciar_assembleia, remover_fcm_token,
//     retentar_webhook, set_app_user_id, marketplace_purchase
//
// Nota técnica: esta versão do @supabase/supabase-js não infere corretamente os
// generics quando o schema tem poucas funções. Por isso usamos `as any` APENAS
// no nome da RPC (padrão documentado do projeto para RPCs não-geradas).

export interface RpcExtensions {
  convocar_assembleia: { Args: { p_assembleia_id: string }; Returns: void };
  iniciar_assembleia: { Args: { p_assembleia_id: string }; Returns: void };
  remover_fcm_token: { Args: { p_token: string }; Returns: void };
  retentar_webhook: { Args: { p_entrega_id: string }; Returns: void };
  set_app_user_id: { Args: { user_id: string }; Returns: void };
  marketplace_purchase: {
    Args: {
      p_discount_id: string;
      p_usuario_id: string;
      p_condominio_id: string;
      p_idempotency_key: string;
    };
    Returns: Record<string, unknown>;
  };
}
