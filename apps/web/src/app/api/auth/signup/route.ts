import { createAdminClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/signup
 * Server-side signup: creates auth user + links to condominio.
 * Uses service role to bypass RLS and avoid trigger chain issues.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, password, telefone, condominio_id } = body;

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Create auth user (this triggers handle_new_user which creates the usuarios row)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        telefone: telefone || null,
        condominio_id: condominio_id || null,
      },
    });

    if (authError) {
      // Check for common errors
      if (
        authError.message?.includes('already been registered') ||
        authError.message?.includes('already exists')
      ) {
        return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 });
      }
      console.error('Auth signup error:', authError);
      return NextResponse.json(
        { error: authError.message || 'Erro ao criar conta' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erro inesperado ao criar usuário' }, { status: 500 });
    }

    // 2. Verify the usuarios row was created by the trigger
    const { data: usuario } = await admin
      .from('usuarios')
      .select('id')
      .eq('auth_id', authData.user.id)
      .single();

    // 3. If trigger didn't create the row (shouldn't happen, but fallback)
    if (!usuario) {
      const { data: newUsuario, error: insertError } = await admin
        .from('usuarios')
        .insert({
          auth_id: authData.user.id,
          nome,
          email,
          telefone: telefone || null,
          condominio_id: condominio_id || null,
          role: 'morador',
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Fallback usuario insert error:', insertError);
        // Still return success - auth user was created
        return NextResponse.json({
          success: true,
          message: 'Conta criada, mas vínculo com condomínio pendente.',
        });
      }

      // Link to condominio if needed
      if (condominio_id && newUsuario) {
        await admin.from('usuario_condominios' as any).insert({
          usuario_id: newUsuario.id,
          condominio_id,
          role: 'morador',
          status: 'pending',
        });
      }
    } else if (condominio_id) {
      // 4. Trigger created the user - verify condominio link exists
      const { data: existingLink } = await admin
        .from('usuario_condominios' as any)
        .select('id')
        .eq('usuario_id', usuario.id)
        .eq('condominio_id', condominio_id)
        .single();

      // Create link if trigger didn't (e.g., old trigger version)
      if (!existingLink) {
        await admin.from('usuario_condominios' as any).insert({
          usuario_id: usuario.id,
          condominio_id,
          role: 'morador',
          status: 'pending',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
    });
  } catch (err) {
    console.error('Signup route error:', err);
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 });
  }
}
