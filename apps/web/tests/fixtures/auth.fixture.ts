import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Load env vars from .env.local if not already loaded (for Playwright)
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });

// Load env vars - assuming they are available in the test process
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      console.log('Login failed, attempting to ensuring test user via Admin API context...');

      const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      // Simple check: if key is short (anon key), we can't do admin stuff. Service key is usually long.
      // But we will try anyway if provided.

      // If we have a service key, we can try to fix the user
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const adminAuth = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY).auth
          .admin;

        // 1. Check if user exists
        const { data: users } = await adminAuth.listUsers();
        const existingUser = users.users.find((u) => u.email === email);

        if (existingUser) {
          // 2a. Update existing user (confirm email + reset password)
          console.log('Updating existing test user credentials...');
          await adminAuth.updateUserById(existingUser.id, {
            password: password,
            email_confirm: true,
            user_metadata: { nome: 'Test Automation User' },
          });
        } else {
          // 2b. Create new confirmed user
          console.log('Creating new confirmed test user...');
          await adminAuth.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nome: 'Test Automation User', telefone: '11999999999' },
          });
        }

        // 3. Retry Login
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (retryError || !retryData.session) {
          throw new Error(`Auth retry failed after Admin fix: ${retryError?.message}`);
        }
        data.session = retryData.session;
      } else {
        // Fallback for non-admin environments (CI without secrets?)
        // Try public sign up (will fail if confirmation needed)
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
          throw new Error(`Auth failed (Public SignUp): ${error?.message || signUpError?.message}`);
        }
        data.session = signUpData.session;
      }
    }

    // 2. Set LocalStorage (Supabase-js client relies on this)
    // The key format is usually: sb-<your-project-ref>-auth-token
    // We need to know the project ref or just use the generic key Supabase uses by default if configured
    // Usually 'sb-[projectId]-auth-token'

    // Extract project ID from URL or generic
    // Actually, @supabase/ssr might look at cookies.
    // Let's set the Cookie which is what our new Secure Auth uses!

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

    // Determine domain for cookies
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const domain = new URL(baseUrl).hostname;

    await page.context().addCookies([
      {
        name: cookieName,
        value: cookieValue,
        domain,
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'condominio_atual',
        value: '',
        domain,
        path: '/',
      },
    ]);

    await page.goto('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
