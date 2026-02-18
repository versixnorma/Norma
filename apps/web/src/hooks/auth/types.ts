import type { Database } from '@/types/database';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export type RoleType = Database['public']['Enums']['user_role'];
export type StatusType = Database['public']['Enums']['user_status'];

export interface UsuarioCondominioJoin {
  condominio: { id: string; nome: string };
  role: RoleType;
  status: string;
}

export interface UsuarioWithCondominios {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  documento?: string | null;
  status: StatusType;
  role: RoleType;
  created_at: string;
  updated_at: string;
  condominio_id?: string | null;
  condominio_atual?: { id: string; nome: string; role: string } | null;
  condominios?: {
    condominio_id: string;
    role: string;
    unidade_identificador?: string;
    condominio: { nome: string };
  }[];
  usuario_condominios?: UsuarioCondominioJoin[];
}

export interface AuthState {
  user: User | null;
  profile: UsuarioWithCondominios | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | Error | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: Session;
  nextRoute?: '/home' | '/admin/dashboard' | '/aguardando-aprovacao';
  error?: unknown;
}

export interface SignupCredentials {
  email: string;
  password: string;
  nome: string;
  telefone?: string;
  condominio_id?: string;
  unidade_id?: string;
  cpf?: string;
  data_nascimento?: string;
  notificacoes_email?: boolean;
  notificacoes_push?: boolean;
  notificacoes_whatsapp?: boolean;
}
