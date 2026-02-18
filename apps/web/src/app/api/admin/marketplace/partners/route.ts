import { withAdminAuth } from '@/lib/api-helpers';
import { partnerSchema } from '@/lib/schemas/marketplace';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }) => {
  const { data, error } = await admin
    .from('marketplace_partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
});

export const POST = withAdminAuth(async ({ admin }, request) => {
  const body = await request.json();
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { data, error } = await admin
    .from('marketplace_partners')
    .insert(parsed.data)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
});
