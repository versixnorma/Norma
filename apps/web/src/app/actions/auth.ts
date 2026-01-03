'use server';

import { createClient } from '@/lib/supabase/server'; // Assumindo client server-side existe ou será criado
import { cookies } from 'next/headers';

export async function switchCondominioAction(condominioId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Verificar sessão
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // 2. Verificar se usuário pertence ao condomínio
  const { data: membership, error } = await supabase
    .from('usuario_condominios')
    .select('role')
    .eq('auth_id', session.user.id)
    .eq('condominio_id', condominioId)
    .single();

  if (error || !membership) {
    throw new Error('User does not belong to this condominium');
  }

  // 3. Atualizar preferência no Banco de Dados (Persistência)
  await supabase
    .from('usuarios')
    .update({ condominium_id: condominioId }) // Corrigir nome da coluna se for diferente, assumindo 'condominio_id'
    .eq('auth_id', session.user.id);

  // 4. Definir Cookie seguro (HttpOnly) para acesso rápido no Middleware
  // Nota: Middleware deve ler este cookie para redirecionamentos se necessário
  cookieStore.set('condominio_atual', condominioId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  return { success: true };
}
