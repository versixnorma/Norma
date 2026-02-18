import { withAdminAuth } from '@/lib/api-helpers';
import { condominioIdParamSchema } from '@/lib/schemas/condominios';
import { NextRequest, NextResponse } from 'next/server';

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return await params;
}

export const GET = withAdminAuth(async (
  { admin },
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) => {
  const rawParams = await resolveParams(context.params);
  const parsed = condominioIdParamSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametros invalidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id } = parsed.data;

  const { data, error } = await admin.from('condominios').select('*').eq('id', id).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const { data: blocos } = await admin
    .from('blocos')
    .select('id, nome')
    .eq('condominio_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({
    data: {
      ...data,
      blocos: (blocos || []).map((b) => ({ id: b.id, nome: b.nome })),
    },
  });
});
