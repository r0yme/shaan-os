# Shaan OS — Business Operating System

A production-grade, self-hosted business management platform built as a Next.js
modular monolith. It brings clients, projects, tasks, billing, messaging,
approvals and AI assistance into one place.

> **Status:** Phase 5 (Billing) — authentication, RBAC, design system, the
> Clients & Leads CRM module, Projects with milestones, a Tasks board, plus
> invoicing and payments. Messaging and approvals arrive in later phases.

## Highlights

- **Next.js 16** (App Router, React 19, Tailwind v4) — modular monolith
- **Auth.js v5** — email/password (bcrypt) + Google OAuth, JWT sessions
- **RBAC** — Owner / Admin / Project Manager / Employee / Client roles with
  granular permissions, enforced server-side on every request
- **PostgreSQL + Prisma 7** with driver adapter, migrations and seed data
- **Clients & Leads** — client/lead CRUD, leads pipeline board with
  convert-to-client, client detail pages and a client portal profile view
- **Projects & Milestones** — project CRUD with client/manager assignment,
  status and priority tracking, milestone breakdowns, and client-facing
  project views in the portal
- **Tasks board** — kanban board across statuses with project filtering,
  assignment and due dates, plus read-only task views for clients
- **Billing** — invoices with line items and tax, sequential invoice numbers,
  send/void lifecycle, payment tracking with auto-paid status, outstanding
  balance summaries, and a read-only invoices page in the client portal
- **Design system** — semantic tokens, light/dark/system themes, reusable UI kit
- **Logging** — pino (pretty in dev, structured JSON in production)
- **Health endpoint** — `/api/health` checks database connectivity
- **Tests** — Vitest for validation, password, rate limiting and nav RBAC logic

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16.3 (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + CSS design tokens |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Auth | next-auth v5 (Credentials + Google) |
| Validation | zod v4 |
| Logging | pino + pino-http |
| Testing | Vitest + Testing Library |
| Icons | lucide-react |

## Project structure

```
prisma/               schema, migrations, seed
scripts/              db-start.ps1, db-stop.ps1 (Windows portable PostgreSQL)
src/
  app/                App Router routes (portal, client portal, auth, API)
  components/         UI kit (ui/), layout shells, auth widgets
  config/             navigation + role-based filtering
  lib/                db, auth, session, rbac, audit, password, validation,
                      rate-limit, logger, errors, utils
  generated/prisma/   Prisma client (generated — not committed)
```

## Prerequisites

- Node.js 20+ (developed on 25.x)
- PostgreSQL 16 (see [DATABASE.md](./DATABASE.md) for a portable local setup)
- Windows: run `npm` as `npm.cmd` if the PowerShell execution policy blocks it

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env     # then edit values (dev creds are fine locally)

# 3. Start PostgreSQL (Windows portable)
.\scripts\db-start.ps1
# Stop with:  .\scripts\db-stop.ps1

# 4. Apply migrations and seed
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts

# 5. Run the app
npm run dev              # http://localhost:3000
```

### Development accounts (seed)

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `Password123!` | Owner (full access) |
| `employee@example.com` | `Password123!` | Employee |
| `client@example.com` | `Password123!` | Client portal |

> These are development-only credentials. Never use them in production.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch mode) |
| `npm run db:start` / `db:stop` | Start/stop local PostgreSQL |

## Architecture notes

- **Authn/Authz**: `src/lib/auth.ts` configures Auth.js. `src/lib/session.ts`
  provides `requireUser`, `requirePermission`, `requireRole` for server-side
  guards. `src/proxy.ts` (Next 16 middleware replacement) redirects anonymous
  visitors to `/login`.
- **RBAC**: permissions are resolved from the database per request — never trust
  client-supplied roles. Roles and permissions are seeded in `prisma/seed.ts`.
- **Rate limiting**: `src/lib/rate-limit.ts` is an in-memory limiter for single
  instances; swap for a Redis-backed limiter (same interface) in production.
- **Errors**: `src/lib/errors.ts` defines the error hierarchy; handlers convert
  these to safe HTTP responses without leaking internals.
- **Audit**: `recordAudit()` writes immutable audit events for security-sensitive
  actions (login, logout, etc.).

## License

Proprietary. For the operator's private use — not for redistribution.
