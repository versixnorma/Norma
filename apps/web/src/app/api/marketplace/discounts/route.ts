import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(await cookies());
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('marketplace_discounts')
    .select(
      `
      *,
      partner:partner_id (
        id,
        name,
        category,
        logo_url
      )
    `
    )
    .eq('status', 'active')
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
