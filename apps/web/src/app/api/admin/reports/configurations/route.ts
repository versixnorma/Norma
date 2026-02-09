import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
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

export async function GET() {
  const supabase = createClient(await cookies());

  try {
    const { data, error } = await supabase
      .from('report_configurations' as never)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: (data || []) as unknown as ReportConfigRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar configurações';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = createClient(await cookies());

  try {
    const body = await request.json();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get usuario id from auth id
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id, condominio_id')
      .eq('auth_id', userData.user.id)
      .single();

    const usuario = usuarioData as unknown as { id: string; condominio_id: string | null } | null;
    if (!usuario) {
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
      condominio_id: body.condominioId || usuario.condominio_id,
      created_by: usuario.id,
    };

    const { data, error } = await supabase
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
}

export async function DELETE(request: Request) {
  const supabase = createClient(await cookies());
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('report_configurations' as never)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao excluir configuração';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
