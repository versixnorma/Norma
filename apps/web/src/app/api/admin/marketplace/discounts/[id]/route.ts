import { withAdminAuth } from '@/lib/api-helpers';
import { discountSchema } from '@/lib/schemas/marketplace';
import { NextRequest, NextResponse } from 'next/server';

// Support both synchronous and promise-based context.params (Next types may vary)
async function resolveParams(params: unknown): Promise<{ id?: string } | undefined> {
  return await Promise.resolve(params as { id?: string } | undefined);
}

export const PUT = withAdminAuth(async (
  { admin },
  request: NextRequest,
  context: { params: unknown }
) => {
  const body = (await request.json()) as Record<string, unknown>;
  const parsed = discountSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await admin
    .from('marketplace_discounts')
    .update(parsed.data)
    .eq('id', id)
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
});

export const DELETE = withAdminAuth(async (
  { admin },
  _request: NextRequest,
  context: { params: unknown }
) => {
  const params = await resolveParams(context.params);
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await admin.from('marketplace_discounts').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
});
