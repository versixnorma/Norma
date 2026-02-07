import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from('marketplace_discounts')
    .select(
      `
      *,
      partner:partner_id (id, name, category)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = createClient(await cookies());
  const payload = await request.json();
  const { data, error } = await supabase
    .from('marketplace_discounts')
    .insert(payload)
    .select(
      `
      *,
      partner:partner_id (id, name, category)
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}
