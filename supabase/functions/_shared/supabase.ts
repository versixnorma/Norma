// ============================================
// VERSIX NORMA - Supabase Client Helper
// ============================================

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient(authHeader?: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  if (authHeader) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Tipos do banco
export type UserRole =
  | 'superadmin'
  | 'admin_condo'
  | 'sindico'
  | 'subsindico'
  | 'conselheiro'
  | 'morador'
  | 'proprietario'
  | 'inquilino'
  | 'porteiro'
  | 'zelador';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'removed';

export interface Usuario {
  id: string;
  auth_id: string;
  condominio_id: string | null;
  unidade_id: string | null;
  nome: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
}
