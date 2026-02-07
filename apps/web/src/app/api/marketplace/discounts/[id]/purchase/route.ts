import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const authClient = createClient(await cookies());
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('usuarios')
    .select(
      `
      id,
      condominio_id,
      usuario_condominios (condominio_id, status)
    `
    )
    .eq('auth_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  type UserCondominio = { condominio_id: string; status?: string };
  const activeCondo =
    profile.usuario_condominios?.find(
      (uc: UserCondominio) => uc.status === 'active' || uc.status === 'ativo'
    )?.condominio_id || profile.condominio_id;

  const { data: discount, error: discountError } = await admin
    .from('marketplace_discounts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (discountError || !discount) {
    return NextResponse.json({ error: 'Desconto não encontrado' }, { status: 404 });
  }

  if (discount.status !== 'active') {
    return NextResponse.json({ error: 'Desconto indisponível' }, { status: 400 });
  }

  const now = new Date();
  if (discount.valid_from && new Date(discount.valid_from) > now) {
    return NextResponse.json({ error: 'Desconto ainda não disponível' }, { status: 400 });
  }
  if (discount.valid_until && new Date(discount.valid_until) < now) {
    return NextResponse.json({ error: 'Desconto expirado' }, { status: 400 });
  }
  if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
    return NextResponse.json({ error: 'Limite de uso atingido' }, { status: 400 });
  }

  const { data: partner } = await admin
    .from('marketplace_partners')
    .select('commission_rate')
    .eq('id', discount.partner_id)
    .single();

  const original = Number(discount.original_price || 0);
  let finalAmount = Number(discount.discounted_price || 0);
  let discountAmount = 0;

  if (!finalAmount) {
    if (discount.discount_type === 'percentage' && original > 0) {
      discountAmount = original * (Number(discount.discount_value) / 100);
      finalAmount = Math.max(original - discountAmount, 0);
    } else if (discount.discount_type === 'fixed' && original > 0) {
      discountAmount = Number(discount.discount_value);
      finalAmount = Math.max(original - discountAmount, 0);
    } else {
      finalAmount = original;
    }
  } else if (original > 0) {
    discountAmount = Math.max(original - finalAmount, 0);
  }

  const commissionRate = Number(partner?.commission_rate || 0);
  const commissionAmount = commissionRate > 0 ? (finalAmount * commissionRate) / 100 : null;

  const { data: transaction, error: txError } = await admin
    .from('marketplace_transactions')
    .insert({
      discount_id: discount.id,
      usuario_id: profile.id,
      condominio_id: activeCondo || null,
      partner_id: discount.partner_id,
      transaction_amount: original || finalAmount,
      discount_amount: discountAmount || null,
      final_amount: finalAmount,
      commission_amount: commissionAmount,
      status: 'pending',
      payment_method: 'marketplace',
    })
    .select('id')
    .single();

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 400 });
  }

  await admin
    .from('marketplace_discounts')
    .update({ usage_count: (discount.usage_count || 0) + 1 })
    .eq('id', discount.id);

  return NextResponse.json({ data: transaction });
}
