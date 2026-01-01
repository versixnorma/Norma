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
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ============================================
// SINGLETON CLIENT (para hooks)
// ============================================
let browserClient: SupabaseBrowserClient | null = null;

export function getSupabaseClient(): SupabaseAnyClient {
  if (typeof window === 'undefined') {
    // Server-side: sempre criar novo
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Browser: singleton
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return browserClient;
}

// ============================================
// ADMIN CLIENT (Server Actions only)
// ============================================
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
