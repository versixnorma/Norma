import { withAdminAuth } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }) => {
  const { data, error } = await admin
    .from('marketplace_transactions')
    .select(
      `
      *,
      partner:partner_id (name),
      discount:discount_id (title),
      condominio:condominio_id (nome),
      usuario:usuario_id (nome)
    `
    )
    .order('transaction_date', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
});
