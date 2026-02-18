import { withAdminAuth } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

export const GET = withAdminAuth(async ({ admin }, request) => {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    const { data, error, count } = await admin
      .from('generated_reports' as never)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar histórico';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
