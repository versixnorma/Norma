# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Versix Norma is a SaaS condominium governance platform built as a **pnpm/Turborepo monorepo**. The main app is a Next.js 16 (App Router) frontend at `apps/web/`, with backend services provided by Supabase (PostgreSQL, Auth, Storage, Edge Functions). Shared types and validators live in `packages/shared/`.

### Prerequisites

- **Node.js >=20** (package.json `engines`; ignore `.nvmrc` in the repo root which says 18.17.0 — it is outdated)
- **pnpm 9.x** (lockfile is `pnpm-lock.yaml`, `packageManager` field specifies 9.15.4)
- **Docker** required for local Supabase (`supabase start` manages containers)

### Running services

1. **Start Docker daemon**: `sudo dockerd &>/tmp/dockerd.log &` then `sudo chmod 666 /var/run/docker.sock`
2. **Start Supabase**: `cd /workspace && npx supabase start` — pulls images, runs migrations, seeds data. Provides PostgreSQL (54322), API (54321), Auth, Studio (54323), Mailpit (54324).
3. **Set up env**: Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the local Supabase keys from `npx supabase status -o env` (ANON_KEY, SERVICE_ROLE_KEY, API_URL).
4. **Create test users**: Use Supabase Auth admin API to create users, then insert matching rows in `public.usuarios` and `public.usuario_condominios`. See `scripts/create-test-users.js` for reference.
5. **Start dev server**: `pnpm dev` → http://localhost:3000

### Key commands (see `package.json` scripts)

| Task       | Command                                       |
| ---------- | --------------------------------------------- |
| Dev server | `pnpm dev`                                    |
| Lint       | `pnpm lint`                                   |
| Type check | `pnpm type-check`                             |
| Unit tests | `pnpm test`                                   |
| E2E tests  | `pnpm test:e2e` (requires dev server running) |
| Format     | `pnpm format`                                 |

### Gotchas

- `pnpm type-check` has 2 pre-existing TS errors in test files (`apps/web/tests/unit/hooks/`). These are in the repository and not caused by agent changes.
- The `.nvmrc` at the repo root says `18.17.0` but `package.json` engines require `>=20.0.0`. Use Node 20+.
- The `apps/web` package warns about `engines: {"node":"20.x"}` when running Node 22, but everything works fine.
- Sentry config in `next.config.mjs` wraps the export — set `SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1` in env to suppress warnings.
- PWA is disabled in development mode (`DISABLE_PWA=true`).
- All third-party APIs (Groq, Qdrant, SendGrid, Twilio, Firebase, Sentry) have graceful fallbacks — they are not blocking for local dev.
- Husky pre-commit hook runs `pnpm types:check` and lint-staged. Commit messages must follow Conventional Commits format.
- Docker in Cloud Agent VMs requires `fuse-overlayfs` storage driver and `iptables-legacy` — see environment setup.
