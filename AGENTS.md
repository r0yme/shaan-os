<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Shaan OS — Project Conventions

## Stack (do not assume newer/older than this)

- **Next.js 16.3** (App Router) — middleware is `src/proxy.ts` (export `proxy`, not `middleware`). Route handlers and layouts follow the current docs in `node_modules/next/dist/docs/`.
- **Prisma 7** — REQUIRES a driver adapter. Never `new PrismaClient()` without `new PrismaPg({ connectionString })`. Client is generated to `src/generated/prisma` (git-ignored, regenerate with `npx prisma generate`). Config lives in `prisma.config.ts`.
- **Auth.js v5 (beta)** — configured in `src/lib/auth.ts`. JWT sessions.
- **zod v4**, **pino**, **Tailwind v4**, **lucide-react**, **next-themes**.

## Commands (Windows)

- `npm` must be invoked as `npm.cmd` (PowerShell execution policy).
- Typecheck: `npx.cmd tsc --noEmit`
- Lint: `npm.cmd run lint` (must be clean before finishing work)
- Tests: `npm.cmd run test` (Vitest, runs `src/**/*.test.{ts,tsx}`)
- DB: PostgreSQL 16 portable at `%LOCALAPPDATA%\PostgreSQL`, managed with `.\scripts\db-start.ps1` / `db-stop.ps1`. Apply schema with `npx.cmd prisma migrate deploy` then `npx.cmd prisma generate`.
- Native/psql tooling in PowerShell breaks on `$`/quoting — prefer Prisma scripts or `tsx` script files over inline `-e`.

## Architecture rules

- **Never trust the client**: roles and permissions are resolved from the database per request (`src/lib/session.ts`, `src/lib/rbac.ts`). Always guard server-side.
- **Client/server boundary**: do NOT pass functions/components as props from a Server Component into a Client Component. Icons crossing the boundary must travel as string keys and be mapped client-side (see `src/components/layout/portal-shell.tsx`).
- **Errors**: throw from `src/lib/errors.ts` hierarchy; handlers map to safe HTTP codes. Never leak stack traces or DB details.
- **Validation**: all untrusted input goes through zod schemas in `src/lib/validation.ts` via `parseWithZod`.
- **Secrets**: `.env` is git-ignored; only `.env.example` is committed. Never log or commit passwords/keys/tokens.
- **Audit**: security-sensitive actions call `recordAudit()` (`src/lib/audit.ts`).
- **RBAC seed**: roles/permissions are seeded idempotently in `prisma/seed.ts`. Add new permission keys to the `PermissionKey` union and the relevant role arrays there.
