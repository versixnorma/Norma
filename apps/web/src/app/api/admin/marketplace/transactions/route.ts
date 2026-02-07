import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
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
}
