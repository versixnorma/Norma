import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Load env vars - assuming they are available in the test process
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

type AuthFixtures = {
  activeUserPage: any; // Using 'any' for Page type temporarily or import Page from @playwright/test
};

// Extend base test with our auth fixture
export const test = base.extend<AuthFixtures>({
  activeUserPage: async ({ page }, use) => {
    // 1. Perform API Login
    const email = 'test.user@example.com'; // Use a dedicated persistent test user
    const password = 'TestUser123!';

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Fallback: Try to sign up if login fails (First run)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: 'Test Automation User',
            telefone: '11999999999',
          },
        },
      });

      if (signUpError || !signUpData.session) {
        throw new Error(`Auth failed: ${error?.message || signUpError?.message}`);
      }
      data.session = signUpData.session;
    }

    // 2. Set LocalStorage (Supabase-js client relies on this)
    // The key format is usually: sb-<your-project-ref>-auth-token
    // We need to know the project ref or just use the generic key Supabase uses by default if configured
    // Usually 'sb-[projectId]-auth-token'

    // Extract project ID from URL or generic
    // Actually, @supabase/ssr might look at cookies.
    // Let's set the Cookie which is what our new Secure Auth uses!

    // 3. Set Cookie Access Token (because we moved to Server Actions/Middleware)
    // The middleware expects cookies.
    // However, during test, we might still be hitting client-side routes.
    // Let's try to set both for maximum compatibility.

    // Cookie format: sb-<project-ref>-auth-token... actually middleware uses its own or default.
    // Best way: Let the Supabase client helper set it? No, we are in node/playwright context.
    // 3. Set Cookie Access Token
    // Format required by @supabase/ssr and auth-helpers:
    // `sb-[PROJECT_REF]-auth-token` = ["access_token", "refresh_token"] (v0)
    // OR `base64-json-session` (v1/ssr)

    // The most reliable way for latest @supabase/ssr is mimicking what `createServerClient` expects.
    // It reads a single cookie usually.

    // Let's assume the project ref is in the URL.
    const projectRef = supabaseUrl.match(/(?:https:\/\/)?([^.]+)/)?.[1];

    if (!projectRef) throw new Error('Could not parse Project Ref from Supabase URL');

    const cookieName = `sb-${projectRef}-auth-token`;

    // For @supabase/ssr, the value is often:
    // `base64-${Buffer.from(JSON.stringify(session)).toString('base64')}`
    // effectively containing access_token, refresh_token, user, etc.

    const sessionStr = JSON.stringify(data.session);
    const cookieValue = `base64-${Buffer.from(sessionStr).toString('base64')}`;

    await page.context().addCookies([
      {
        name: cookieName,
        value: cookieValue,
        domain: 'localhost', // TODO: Make dynamic based on baseURL
        path: '/',
        httpOnly: false, // We can't simulate httpOnly=true easily from client side but for test context it's fine
        secure: false,
        sameSite: 'Lax',
      },
      // Also set the "condominio_atual" cookie if we want to simulate persistent selection
      {
        name: 'condominio_atual',
        // We need a valid ID. For now let's hope the default works or we fetch it.
        // Ideally we fetch the user's condominium from DB but let's skip for basic auth.
        value: '',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
