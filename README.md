# Shaan OS — Business Operating System

A production-grade, self-hosted business management platform built as a Next.js
modular monolith. It brings clients, projects, tasks, billing, messaging,
approvals and AI assistance into one place.

> **Status:** Phase 19 (Security) — authentication, RBAC, design system,
> the Clients & Leads CRM module, Projects with milestones, a Tasks board,
> invoicing, payments, expenses, a Team module, reporting & analytics,
> team↔client messaging, an approvals workflow, time tracking, a shared
> calendar with a month grid, file sharing with secure downloads, a
> contractor roster with project assignments, an in-app notification feed,
> a workspace settings page, an audit log viewer, a workspace-wide search,
> an owner-only finance dashboard, and a security hub for password resets
> and forcing a full sign-out. The rest arrives later.

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
- **Team / Employees** — team member accounts with role assignment, status
  management, per-employee profiles and activity summaries
- **Reports & Analytics** — revenue/invoice/expense KPIs with date-range
  filtering, monthly revenue trends, expense-by-category and revenue-by-client
  breakdowns, project profitability tables and CSV export
- **Messaging** — team↔client conversation threads with unread counts,
  per-side read tracking, and a client-portal inbox for replying
- **Approvals** — request/decide/cancel workflow for expenses, invoices and
  milestones, with a status-filterable review queue and request entry points
  directly from the expenses list
- **Time tracking** — per-member time entries linked to tasks, weekly/monthly/
  all-time hour summaries, member and task filters, and edit/delete scoped to
  the entry owner (managers can manage any entry)
- **Calendar** — shared team calendar with a month grid, month navigation,
  per-day quick scheduling and optional project/client links; editing and
  deletion are scoped to the event creator (managers can manage any event)
- **File sharing** — upload documents and assets with optional project/client
  links, size/summary cards and project/client filters; secure attachment-style
  downloads (25 MB cap, path-traversal-safe local storage) scoped so a client
  only ever sees their own files, plus a read-only files page in the client
  portal
- **Contractors** — external specialist roster with contact details, specialty,
  hourly rate and active/inactive status, project assignments (many-to-many),
  status/project filtering and rate summaries; managed by owners and admins
- **Notifications** — an in-app notification feed with a sidebar bell (unread
  badge, recent-unread dropdown) in both the team and client portals plus a
  full history page. Notifications are generated automatically: approval
  requests and decisions, task assignments, team messages and shared files.
  Read/unread, mark-all-read and (for admins) deletion with unread/all filters
- **Settings** — workspace profile editing (business name, contact details,
  address, country, currency, timezone, invoice prefix) plus a system-role
  overview with permission and member counts; changes are audit-logged and
  feed the client portal and invoice numbering
- **Audit log** — a chronological viewer over every recorded security action
  (login, approval decisions, CRUD, settings changes) with text search and
  action/entity filters; visible to owners only
- **Global search** — one search box across clients, leads, projects, tasks,
  invoices, contractors, employees and shared files, grouped by type
- **Finance dashboard** — owner-only view of revenue collected, outstanding
  invoices, spending by category and net position, with an unpaid-invoices
  table and recent payments
- **Security** — owner-only hub that lists every team account with roles and
  last sign-in, lets you reset any user's password, and can invalidate every
  active session at once (via per-user `tokenVersion`), plus a personal
  sign-in activity feed
- **Billing** — invoices with line items and tax, sequential invoice numbers,
  send/void lifecycle, payment tracking with auto-paid status, outstanding
  balance summaries, expense tracking with category breakdowns, and a
  read-only invoices page in the client portal
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
