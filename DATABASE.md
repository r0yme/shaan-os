# Database — PostgreSQL 16

## Connection

Local development uses a portable PostgreSQL 16.15 instance (no installer, no
admin rights needed). The dev connection string lives in `.env`:

```
DATABASE_URL="postgresql://postgres:shaan_dev_pg_2026@127.0.0.1:5432/shaan_os?schema=public"
```

> The dev password is a plaintext placeholder. In production use a generated
> secret managed by your deployment platform — never a checked-in value.

## Portable PostgreSQL on Windows

Binaries: `%LOCALAPPDATA%\PostgreSQL\pgsql`
Data cluster: `%LOCALAPPDATA%\PostgreSQL\data`

```powershell
# Start the server (daemonizes — safe to close the terminal)
.\scripts\db-start.ps1

# Stop the server
.\scripts\db-stop.ps1

# Check it is up
pg_isready -h 127.0.0.1 -p 5432
```

The scripts are thin wrappers around `pg_ctl`. If you prefer a different
PostgreSQL (Docker, Windows service, remote), just point `DATABASE_URL` at it —
Prisma works with any PostgreSQL 15+.

## Schema management with Prisma 7

Prisma 7 uses a **driver adapter** (`@prisma/adapter-pg`) — the client is
configured in `src/lib/db.ts`, and Prisma reads config from `prisma.config.ts`
(which loads `.env`).

```bash
# Apply all committed migrations
npx prisma migrate deploy

# Create a new migration after editing prisma/schema.prisma
npx prisma migrate dev --name describe_change

# Regenerate the client into src/generated/prisma (ignored by git)
npx prisma generate

# Seed roles, permissions and dev users (idempotent)
npx tsx prisma/seed.ts
```

The generated client lives in `src/generated/prisma` and is **not committed**.
`npm run build` runs `prisma generate` automatically; after a fresh clone run it
once manually before starting the dev server.

## Schema overview

Models live in `prisma/schema.prisma`. Current foundation tables:

| Model | Purpose |
| --- | --- |
| `User` | Team members (`USER`) and clients (`CLIENT`), credentials, job title, status and lockout state |
| `Account` / `Session` / `VerificationToken` | Auth.js tables (OAuth accounts, sessions, password reset) |
| `Role` | Owner / Admin / Project Manager / Employee / Client |
| `Permission` | Granular capability keys (e.g. `clients.view`, `invoices.create`) |
| `RolePermission` | M:N role → permission assignments |
| `UserRole` | M:N user → role assignments |
| `BusinessProfile` | Workspace identity, currency, timezone, invoice prefix |
| `Setting` | Key/value application settings |
| `AuditLog` | Immutable, security-relevant audit events |
| `Client` | Business/individual customers, lifecycle status, account manager, portal login link |
| `Lead` | Prospects tracked through the pipeline (NEW → QUALIFIED → PROPOSAL → WON/LOST), deal value in minor units |
| `Project` | Deliverables with client/manager assignment, status, priority, budget and dates |
| `Milestone` | Delivery checkpoints within a project (PENDING → COMPLETED) |
| `Task` | Work items with status/priority, optional project link, assignee, due date and estimate |
| `Invoice` | Billable documents with sequential numbers, client/project links, status lifecycle and tax |
| `InvoiceItem` | Line items on an invoice (description, quantity, unit price) |
| `Payment` | Recorded payments against invoices, with method, reference and recorder |
| `Expense` | Business spending with category, merchant, optional project/client link and recorder |
| `Conversation` | Thread between the workspace and a client, with per-side read markers and optional project link |
| `Message` | A single message in a conversation, tagged with the sender kind (team user or client) |
| `Approval` | One request per `(type, entityId)` for an invoice, expense or milestone, with requestor, decider and decision metadata |

Enums: `UserKind` (`USER | CLIENT`), `UserStatus`
(`ACTIVE | INVITED | SUSPENDED | INACTIVE`),
`AuditAction` (security events), `ClientStatus`, `ClientKind`, `LeadSource`,
`LeadStatus`, `ProjectStatus`, `ProjectPriority`, `MilestoneStatus`,
`TaskStatus`, `TaskPriority`, `InvoiceStatus` (`DRAFT | SENT | PAID | VOID`),
`PaymentMethod` (`CASH | BANK_TRANSFER | CREDIT_CARD | OTHER`),
`ExpenseCategory` (`SOFTWARE | HARDWARE | SERVICES | TRAVEL | MEALS | OFFICE | OTHER`),
`MessageSenderKind` (`USER | CLIENT`),
`ApprovalType` (`INVOICE | EXPENSE | MILESTONE`), `ApprovalStatus`
(`PENDING | APPROVED | REJECTED`).
Import them from `src/generated/prisma/enums`.

> **Money is stored in minor units** (cents) everywhere — invoice subtotal,
> tax and total, line-item prices and payments are integers. Tax is stored as
> basis points (`taxRateBps`, 500 = 5%). Invoice numbers are generated from
> `BusinessProfile.invoicePrefix` plus `invoiceNextNumber` (incremented in a
> transaction). A payment that brings recorded totals to >= the invoice total
> marks the invoice `PAID`.

## Backup / restore (pg_dump)

```powershell
& "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\pg_dump.exe" -h 127.0.0.1 -U postgres -d shaan_os > shaan_os_backup.sql
# restore:
# & "$env:LOCALAPPDATA\PostgreSQL\pgsql\bin\psql.exe" -h 127.0.0.1 -U postgres -d shaan_os -f shaan_os_backup.sql
```

Automated nightly backups are planned (Phase 11, `backup.manage` permission).
