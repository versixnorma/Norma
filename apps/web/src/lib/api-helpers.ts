import { createAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

/**
 * Wrapper de validação Zod para API Routes.
 * Valida o body JSON contra o schema e retorna 400 com detalhes em caso de erro.
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (data: T, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Dados inválidos',
            details: result.error.flatten(),
          },
          { status: 400 }
        );
      }

      return handler(result.data, req);
    } catch {
      return NextResponse.json(
        { error: 'Request body inválido ou ausente' },
        { status: 400 }
      );
    }
  };
}

/** Contexto injetado pelo withAdminAuth */
export type AdminAuthContext = {
  admin: ReturnType<typeof createAdminClient>;
  usuario: { id: string; role: string };
};

/**
 * Wrapper DRY para rotas admin que requerem superadmin.
 * Verifica autenticação + role superadmin e injeta admin client.
 */
export function withAdminAuth(
  handler: (ctx: AdminAuthContext, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authClient = createClient(await cookies());
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: usuario } = await admin
      .from('usuarios')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!usuario || usuario.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - requer superadmin' }, { status: 403 });
    }

    return handler({ admin, usuario }, req);
  };
}
