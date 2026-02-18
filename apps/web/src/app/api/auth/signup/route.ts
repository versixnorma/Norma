import { createAdminClient } from '@/lib/supabase';
import { withValidation } from '@/lib/api-helpers';
import { signupSchema, type SignupInput } from '@/lib/schemas/api';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/signup
 * Server-side signup: creates auth user + ensures usuarios/condominio link.
 * Uses service role to bypass RLS. Trigger handle_new_user may or may not
 * create the usuarios row — this route guarantees it exists either way.
 */
export const POST = withValidation(signupSchema, async (data: SignupInput) => {
  try {
    const {
      nome,
      email,
      password,
      telefone,
      condominio_id,
      unidade_id,
      cpf,
      data_nascimento,
      notificacoes_email,
      notificacoes_push,
      notificacoes_whatsapp,
    } = data;

    const admin = createAdminClient();

    // 1. Create auth user (trigger handle_new_user fires but is bulletproof)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        telefone: telefone || null,
        condominio_id: condominio_id || null,
        unidade_id: unidade_id || null,
        cpf: cpf || null,
        data_nascimento: data_nascimento || null,
      },
    });

    if (authError) {
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

    const authId = authData.user.id;

    // 2. Ensure usuarios row exists (trigger may or may not have created it)
    const { data: existingUsuario } = await admin
      .from('usuarios')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();

    let usuarioId: string;

    if (existingUsuario) {
      usuarioId = existingUsuario.id;
      await admin
        .from('usuarios')
        .update({
          telefone: telefone || null,
          unidade_id: unidade_id || null,
          cpf: cpf || null,
          data_nascimento: data_nascimento || null,
          notificacoes_email: typeof notificacoes_email === 'boolean' ? notificacoes_email : true,
          notificacoes_push: typeof notificacoes_push === 'boolean' ? notificacoes_push : true,
          notificacoes_whatsapp:
            typeof notificacoes_whatsapp === 'boolean' ? notificacoes_whatsapp : false,
        })
        .eq('id', usuarioId);
    } else {
      // Trigger failed silently — create manually
      const { data: newUsuario, error: insertError } = await admin
        .from('usuarios')
        .insert({
          auth_id: authId,
          nome,
          email,
          telefone: telefone || null,
          unidade_id: unidade_id || null,
          cpf: cpf || null,
          data_nascimento: data_nascimento || null,
          notificacoes_email: typeof notificacoes_email === 'boolean' ? notificacoes_email : true,
          notificacoes_push: typeof notificacoes_push === 'boolean' ? notificacoes_push : true,
          notificacoes_whatsapp:
            typeof notificacoes_whatsapp === 'boolean' ? notificacoes_whatsapp : false,
          role: 'morador',
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Fallback usuario insert error:', insertError);
        const { data: recoveredUsuario } = await admin
          .from('usuarios')
          .select('id')
          .eq('auth_id', authId)
          .maybeSingle();

        if (!recoveredUsuario) {
          await admin.auth.admin.deleteUser(authId);
          return NextResponse.json(
            { error: 'Conta não pôde ser finalizada. Tente novamente em instantes.' },
            { status: 500 }
          );
        }

        usuarioId = recoveredUsuario.id;
      } else {
        usuarioId = newUsuario.id;
      }
    }

    // 3. Ensure usuario_condominios link exists
    if (condominio_id && usuarioId) {
      const { data: existingLink } = await admin
        .from('usuario_condominios')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('condominio_id', condominio_id)
        .maybeSingle();

      if (!existingLink) {
        await admin.from('usuario_condominios').insert({
          usuario_id: usuarioId,
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
});
