import { withAdminAuth } from '@/lib/api-helpers';
import { condominioIdParamSchema } from '@/lib/schemas/condominios';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

async function resolveParams(params: Promise<{ id: string }> | { id: string }) {
  return await params;
}

export const GET = withAdminAuth(
  async (
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
  }
);

// PATCH - Update status (activate / inactivate)
export const PATCH = withAdminAuth(
  async (
    { admin },
    req: NextRequest,
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

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').toLowerCase();

    if (!['inactivate', 'activate'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const updates: Partial<Database['public']['Tables']['condominios']['Update']> =
      action === 'inactivate' ? { ativo: false } : { ativo: true, deleted_at: null };

    const { error } = await admin.from('condominios').update(updates).eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: { id, action } });
  }
);

// DELETE - Soft delete condominium
export const DELETE = withAdminAuth(
  async (
    { admin },
    _req: NextRequest,
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

    const now = new Date().toISOString();
    const { error } = await admin
      .from('condominios')
      .update({ deleted_at: now, ativo: false })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: { id, deleted_at: now } });
  }
);
