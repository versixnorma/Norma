import { withAdminAuth } from '@/lib/api-helpers';
import { reportConfigurationSchema } from '@/lib/schemas/reports';
import { NextResponse } from 'next/server';

interface ReportConfigRow {
  id: string;
  condominio_id: string | null;
  created_by: string;
  name: string;
  report_type: string;
  metrics: unknown;
  filters: unknown;
  format: string;
  schedule: string | null;
  recipients: unknown;
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const GET = withAdminAuth(async ({ admin }) => {
  try {
    const { data, error } = await admin
      .from('report_configurations' as never)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: (data || []) as unknown as ReportConfigRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configurações';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withAdminAuth(async ({ admin, usuario }, request) => {
  try {
    const rawBody = await request.json();
    const parsed = reportConfigurationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const { data: usuarioData } = await admin
      .from('usuarios')
      .select('id, condominio_id, role')
      .eq('id', usuario.id)
      .single();

    const usuarioAtual = usuarioData as unknown as { id: string; condominio_id: string | null } | null;
    if (!usuarioAtual) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const config = {
      name: body.name,
      report_type: body.reportType,
      metrics: body.metrics || [],
      filters: body.filters || {},
      format: body.format || 'pdf',
      schedule: body.schedule || null,
      recipients: body.recipients || [],
      condominio_id: body.condominioId || usuarioAtual.condominio_id,
      created_by: usuarioAtual.id,
    };

    const { data, error } = await admin
      .from('report_configurations' as never)
      .insert(config as never)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar configuração';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const { error } = await admin
      .from('report_configurations' as never)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir configuração';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
