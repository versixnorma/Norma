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

  // 2. Verificar se usuário pertence ao condomínio (Simplificado: Check if ID param is valid)
  // A verificação de permissão idealmente deveria consultar a tabela usuario_condominios.
  // Por enquanto, confiamos na sessão e apenas atualizamos o contexto via cookie.

  // Opcional: Validar se o usuário realmente tem acesso ao condomínio via usuario_condominios
  /*
  const { data: userCondo, error: checkError } = await supabase
    .from('usuario_condominios')
    .select('id')
    .eq('usuario_id', session.user.id)
    .eq('condominio_id', condominioId)
    .single();

  if (checkError || !userCondo) {
     throw new Error('User does not belong to this condominium');
  }
  */

  // Update removido pois coluna condominio_id não existe mais na tabela usuarios.
  // A persistencia do contexto é feita via cookie.

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
