# Remaining modules — Audit, Search, Finance, Security, Backup

Execution order (user-approved): Audit → Search → Finance → Security → Backup.
Each phase is a separate logical commit following the established pipeline:
tsc → lint → test → build → prod smoke on port 3999 → README/DATABASE.md updates.

Baseline: commit `41c1ca2`, 167 tests passing, tree clean.

---

## Phase 16 — Audit log viewer (`audit.view`, Owner-only)

`recordAudit()` already writes every sensitive action; only a read-only viewer is needed.

### Files
- `src/app/(portal)/audit/page.tsx` (new, server)
- `src/components/audit/audit-log-view.tsx` (new, client)
- `src/config/nav.ts` + `src/config/nav.test.ts` — add `audit` NavIconKey + entry
- `src/components/layout/portal-shell.tsx` — NAV_ICONS `audit: ScrollText`
- `prisma/seed.ts` — optional demo audit rows (idempotent)
- README Phase 16

### Page behavior
- `guardPermission("audit.view")`
- `searchParams`: `q` (ILIKE on summary/entity/actor.name), `action` (AuditAction enum), `entity`
- Query: `prisma.auditLog.findMany({ where, include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 200 })`
- Distinct entity list via `findMany({ distinct: ["entity"], select: { entity: true } })`
- Serialize to client rows: id, action, actorName, actorType, entity, summary, ip, createdAt (ISO)
- Filter bar (client): search input + action select + entity select → `router.push("/audit?q=&action=&entity=")`
- DataTable columns: Time (`formatDate`), Action (badge w/ tone map), Actor (name/email or "System"/"Client"), Entity (badge outline), Summary, IP
- Action badge tones: LOGIN primary, LOGIN_FAILED destructive, CREATE primary, UPDATE default, DELETE/SOFT_DELETE destructive, APPROVE success, REJECT destructive, SETTINGS_CHANGE warning, STATUS_CHANGE warning, ROLE_CHANGE/PERMISSION_CHANGE warning, EXPORT outline, other default
- actorType display: "user" → actor name, "client" → "Client", "system" → "System"
- Empty state when no rows; `take: 200` cap (note shown if truncated)

### Nav
- `NavIconKey` + `NAV_ITEMS` entry `{ href: "/audit", label: "Audit", icon: "audit", permission: "audit.view" }` placed after Reports
- nav.test: "shows audit only with audit.view" + add `audit.view` to the all-permissions case

### Seed (demo)
- Idempotent demo rows for admin actor: LOGIN (last week), CREATE "Client" (Acme), SETTINGS_CHANGE "BusinessProfile". Delete by summary marker then insert.

### Docs
- README status Phase 16 (Audit), highlight bullet
- DATABASE.md: AuditLog already documented; no schema change

---

## Phase 17 — Global search (`search.global`, Owner/Admin/PM)

### Files
- `src/app/(portal)/search/page.tsx` (new, server)
- `src/components/search/global-search.tsx` (new, client — input + result groups)
- nav: `search` NavIconKey, entry `{ href: "/search", label: "Search", icon: "search", permission: "search.global" }`, icon `Search`
- nav.test additions (search.global)

### Page behavior
- `guardPermission("search.global")`
- `searchParams.q`; no q → EmptyState "Type to search across your workspace"
- Query each model with `contains: q`, `mode: "insensitive"`, `take: 8`, `deletedAt: null` where applicable:
  - Client: name, email
  - Lead: name, company, email
  - Project: name
  - Task: title
  - Invoice: number (status SENT/PAID)
  - Contractor: name, company, specialty
  - User (kind USER): name, email
  - SharedFile: name
- Grouped results with icons + title + subtitle + href; each group header shows count
- Result links: `/clients/[id]`, `/leads/[id]` (check existing routes), `/projects/[id]`, `/tasks`, `/billing/[id]`, `/contractors`, `/employees/[id]`, `/files`
- Client component: single input (big, autofocus), submits via router.push; results rendered server-side

### Docs
- README Phase 17; nav.test

---

## Phase 18 — Finance dashboard (`finance.view`, Owner-only)

### Files
- `src/app/(portal)/finance/page.tsx` (new, server)
- nav: `finance` NavIconKey, entry after Reports, icon `Coins`
- nav.test additions

### Page behavior
- `guardPermission("finance.view")`
- Reuse `MetricCard`, `RangePicker`, `DataTable`, `Card` components from reports
- Range via `searchParams.range` + `sinceForRange`
- KPIs (all in cents, `formatCurrency(cents/100)`): Revenue collected (payments in range), Outstanding (SENT invoices totalCents), Expenses (range), Net = revenue − expenses, Pending approvals count
- Tables:
  - Unpaid invoices: number, client name, totalCents, dueDate, status badge, link to `/billing/[id]` (status SENT, sorted by dueDate asc)
  - Recent payments (range, desc, take 10): date, invoice number, client, amountCents
  - Expense summary by category (range): category label + total, reuse CATEGORY_LABELS
- No schema change

### Docs
- README Phase 18, DATABASE.md none

---

## Phase 19 — Security / Auth management (`auth.manage`, Owner-only)

### Schema
- `User.tokenVersion Int @default(0)` + migration `add_token_version` + generate
- `src/lib/auth.ts`: in `jwt` callback store `tokenVersion` from DB user (jwt.user.id available on sign-in; refresh via `getUserPermissions`-style fetch or store on login only). Keep simple: capture at sign-in; `getCurrentUser` enforces.
- `src/lib/session.ts` `getCurrentUser()`: after loading user, compare `jwt.tokenVersion` vs `user.tokenVersion`; mismatch → return null (forces re-login)

### Actions `src/app/(portal)/security/actions.ts`
- `adminResetPasswordAction(input)` — guard `auth.manage`; schema `{ userId, password }` (passwordSchema); bcrypt hash; update; `recordAudit` PASSWORD_CHANGE with metadata; return ok
- `forceSignOutAllAction()` — guard `auth.manage`; `updateMany` bump `tokenVersion: { increment: 1 }`; `recordAudit` LOGOUT or PASSWORD_RESET w/ summary; revalidate `/security`
- (self password change for all users exists in Settings profile area — not needed)

### Page `src/app/(portal)/security/page.tsx` (server) + client component
- guard `auth.manage`
- User table (kind USER, not deleted): name, email, status badge, lastLoginAt, roles
- Per-user "Reset password" button → modal (new password field, uses passwordSchema)
- "Sign everyone out" button → ConfirmDialog, calls forceSignOutAllAction
- Recent sign-in activity card for the signed-in user: AuditLog where actorId = me, action in LOGIN/LOGIN_FAILED, take 10, show time + result badge
- nav: `security` NavIconKey, entry `{ href: "/security", label: "Security", icon: "security", permission: "auth.manage" }`, icon `ShieldCheck`; nav.test

### Docs
- README Phase 19; DATABASE.md (User tokenVersion note)

---

## Phase 20 — Backup management (`backup.manage`, Owner-only) — NO restore in v1

### Files
- `src/lib/backup.ts` (new)
- `src/app/(portal)/backup/actions.ts` (new)
- `src/app/(portal)/backup/page.tsx` (new, server)
- `src/components/backup/backup-manager.tsx` (new, client)
- `src/app/api/backups/[name]/download/route.ts` (new)
- nav: `backup` NavIconKey, icon `Database`, entry `{ href: "/backup", label: "Backup", icon: "backup", permission: "backup.manage" }`
- `.gitignore`: add `/storage/backups/` (storage/ already ignored → verify)

### `src/lib/backup.ts`
- `backupRoot()` → `storage/backups` (env override `BACKUP_DIR`)
- `pgBinDir()` → `process.env.PG_BIN` else `%LOCALAPPDATA%\PostgreSQL\pgsql\bin`
- `createBackup(now)`: `execFile(pg_dump, [uri-ish envs, "-d", DATABASE_URL, "--format=custom", "-f", path])` — prefer passing connection via env `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` parsed from DATABASE_URL to avoid psql URI quoting issues on Windows; write to `${root}/shaan_os_<timestamp>.dump`; return filename
- `listBackups()`: readdir, filter `.dump`, stat size/mtime, sort desc
- `resolveBackupName(name)`: path-traversal-safe (`resolveWithinRoot` pattern from storage.ts) → absolute path or throw NotFoundError
- `removeBackup(name)`
- File-size guard: skip non-.dump / empty

### Actions
- `createBackupAction()` — guard backup.manage; run pg_dump; audit EXPORT "Database backup created" (filename in summary); revalidate /backup; return { ok, id: filename } (filename may be used as id)
- `deleteBackupAction(filename)` — guard backup.manage; resolve + unlink; audit DELETE; revalidate

### Download route
- `GET /api/backups/[name]/download` — auth `requirePermission("backup.manage")`; resolve name; stream file with Content-Disposition attachment; 401/403/404/500 mapping (mirror files download route)

### Page + client
- Card with "Create backup" button (loading state) + hint about pg_dump location
- DataTable: Filename, Size (`formatBytes`), Created (date), actions: Download (Link) + Delete (confirm)
- Note: v1 has create/list/download/delete only; restore comes later

### Docs
- README Phase 20; DATABASE.md backup section note (manual pg_dump already documented; mention app-level backups + BACKUP_DIR env)

---

## Verification per phase
1. `npx.cmd tsc --noEmit`
2. `npm.cmd run lint`
3. `npm.cmd run test` (baseline 167, grows per phase)
4. `npm.cmd run build`
5. Prod smoke on 3999: login as admin/employee/client, check page status + role guards (owner 200, others 307), API routes 401 anon
6. Kill node, remove smoke artifacts, `git add -A` + single commit per phase
