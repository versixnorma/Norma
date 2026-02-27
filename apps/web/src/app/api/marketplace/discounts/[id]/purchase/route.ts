import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PurchaseSchema = z.object({
  idempotencyKey: z.string().uuid('Idempotency key deve ser UUID'),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authClient = createClient(await cookies());
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validar body com Zod
  let body: z.infer<typeof PurchaseSchema>;
  try {
    body = PurchaseSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'idempotencyKey (UUID) é obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { id: discountId } = await context.params;

  // Resolver perfil e condomínio ativo
  type UsuarioProfile = {
    id: string;
    condominio_id?: string | null;
    usuario_condominios?: { condominio_id: string; status?: string }[];
  };

  const { data: profile } = (await admin
    .from('usuarios')
    .select('id, condominio_id, usuario_condominios(condominio_id, status)')
    .eq('auth_id', user.id)
    .single()) as { data: UsuarioProfile | null; error: unknown };

  if (!profile) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  type UC = { condominio_id: string; status?: string };
  const activeCondo =
    (profile.usuario_condominios as UC[])?.find(
      (uc) => uc.status === 'active' || uc.status === 'ativo'
    )?.condominio_id || profile.condominio_id;

  // RPC atômica — toda a lógica é server-side em uma única transação
  const { data: result, error } = await admin.rpc('marketplace_purchase' as never, {
    p_discount_id: discountId,
    p_usuario_id: profile.id,
    p_condominio_id: activeCondo,
    p_idempotency_key: body.idempotencyKey,
  } as never);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC retorna { error: "..." } ou { data: { id: "..." } }
  const rpcResult = result as Record<string, unknown>;
  if (rpcResult.error) {
    const status =
      rpcResult.error === 'Desconto não encontrado'
        ? 404
        : rpcResult.error === 'Limite de uso atingido'
          ? 409
          : 400;
    return NextResponse.json({ error: rpcResult.error }, { status });
  }

  return NextResponse.json(rpcResult, {
    headers: rpcResult.idempotent ? { 'X-Idempotent-Replay': 'true' } : {},
  });
}
