import type { Database } from '@/types/database';
import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPE DEFINITIONS
// ============================================
type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;
type SupabaseServerClient = ReturnType<typeof createSupabaseClient<Database>>;
type SupabaseAnyClient = SupabaseBrowserClient | SupabaseServerClient;

// ============================================
// BROWSER CLIENT (Client Components)
// ============================================
export function createClient(): SupabaseBrowserClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public env vars are missing');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'public' },
    global: {
      headers: {
        apikey: supabaseAnonKey,
      },
    },
  });
}

// ============================================
// SINGLETON CLIENT (para hooks)
// ============================================
let browserClient: SupabaseBrowserClient | null = null;

export function getSupabaseClient(): SupabaseAnyClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public env vars are missing');
  }

  if (typeof window === 'undefined') {
    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'public' },
      global: {
        headers: {
          apikey: supabaseAnonKey,
        },
      },
    });
  }

  // Browser: singleton
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'public' },
      global: {
        headers: {
          apikey: supabaseAnonKey,
        },
      },
    });
  }

  return browserClient;
}

// ============================================
// ADMIN CLIENT (Server Actions only)
// ============================================
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server env vars are missing');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    db: { schema: 'public' },
    global: {
      headers: {
        apikey: serviceRoleKey,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
