import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

type PermissionKey =
  | "clients.view"
  | "clients.create"
  | "clients.update"
  | "clients.delete"
  | "leads.view"
  | "leads.create"
  | "leads.update"
  | "leads.delete"
  | "leads.convert"
  | "employees.view"
  | "employees.create"
  | "employees.update"
  | "employees.delete"
  | "projects.view"
  | "projects.create"
  | "projects.update"
  | "projects.delete"
  | "milestones.view"
  | "milestones.create"
  | "milestones.update"
  | "milestones.delete"
  | "tasks.view"
  | "tasks.create"
  | "tasks.assign"
  | "tasks.update"
  | "tasks.delete"
  | "time.view"
  | "time.create"
  | "time.update"
  | "messages.view"
  | "messages.send"
  | "messages.delete"
  | "files.view"
  | "files.upload"
  | "files.download"
  | "files.delete"
  | "approvals.view"
  | "approvals.manage"
  | "invoices.view"
  | "invoices.create"
  | "invoices.send"
  | "invoices.void"
  | "payments.view"
  | "payments.create"
  | "payments.refund"
  | "expenses.view"
  | "expenses.create"
  | "expenses.update"
  | "expenses.delete"
  | "contractors.view"
  | "contractors.create"
  | "contractors.update"
  | "contractors.delete"
  | "calendar.view"
  | "calendar.create"
  | "calendar.update"
  | "calendar.delete"
  | "reports.view"
  | "finance.view"
  | "notifications.view"
  | "notifications.manage"
  | "audit.view"
  | "backup.manage"
  | "settings.manage"
  | "search.global"
  | "auth.manage"
  | "ai.use";

const ALL_PERMISSIONS: PermissionKey[] = [
  "clients.view", "clients.create", "clients.update", "clients.delete",
  "leads.view", "leads.create", "leads.update", "leads.delete", "leads.convert",
  "employees.view", "employees.create", "employees.update", "employees.delete",
  "projects.view", "projects.create", "projects.update", "projects.delete",
  "milestones.view", "milestones.create", "milestones.update", "milestones.delete",
  "tasks.view", "tasks.create", "tasks.assign", "tasks.update", "tasks.delete",
  "time.view", "time.create", "time.update",
  "messages.view", "messages.send", "messages.delete",
  "files.view", "files.upload", "files.download", "files.delete",
  "approvals.view", "approvals.manage",
  "invoices.view", "invoices.create", "invoices.send", "invoices.void",
  "payments.view", "payments.create", "payments.refund",
  "expenses.view", "expenses.create", "expenses.update", "expenses.delete",
  "contractors.view", "contractors.create", "contractors.update", "contractors.delete",
  "calendar.view", "calendar.create", "calendar.update", "calendar.delete",
  "reports.view", "finance.view",
  "notifications.view", "notifications.manage",
  "audit.view", "backup.manage", "settings.manage", "search.global", "auth.manage", "ai.use",
];

const ADMIN_PERMISSIONS: PermissionKey[] = [
  "clients.view", "clients.create", "clients.update", "clients.delete",
  "leads.view", "leads.create", "leads.update", "leads.delete", "leads.convert",
  "employees.view",
  "projects.view", "projects.create", "projects.update", "projects.delete",
  "milestones.view", "milestones.create", "milestones.update", "milestones.delete",
  "tasks.view", "tasks.create", "tasks.assign", "tasks.update", "tasks.delete",
  "time.view", "time.create", "time.update",
  "messages.view", "messages.send", "messages.delete",
  "files.view", "files.upload", "files.download", "files.delete",
  "approvals.view", "approvals.manage",
  "calendar.view", "calendar.create", "calendar.update", "calendar.delete",
  "reports.view",
  "notifications.view", "notifications.manage",
  "search.global",
];

const PROJECT_MANAGER_PERMISSIONS: PermissionKey[] = [
  "clients.view",
  "leads.view", "leads.update",
  "projects.view", "projects.create", "projects.update",
  "milestones.view", "milestones.create", "milestones.update", "milestones.delete",
  "tasks.view", "tasks.create", "tasks.assign", "tasks.update", "tasks.delete",
  "time.view",
  "messages.view", "messages.send",
  "files.view", "files.upload", "files.download",
  "approvals.view", "approvals.manage",
  "calendar.view", "calendar.create", "calendar.update",
  "reports.view",
  "notifications.view",
  "search.global",
];

const EMPLOYEE_PERMISSIONS: PermissionKey[] = [
  "tasks.view", "tasks.update",
  "time.view", "time.create", "time.update",
  "messages.view", "messages.send",
  "files.view", "files.upload", "files.download",
  "calendar.view",
  "notifications.view",
];

const CLIENT_PERMISSIONS: PermissionKey[] = [
  "clients.view",
  "projects.view",
  "tasks.view",
  "messages.view", "messages.send",
  "files.view", "files.upload", "files.download",
  "approvals.view", "approvals.manage",
  "invoices.view",
  "payments.view",
  "notifications.view",
];

function moduleOf(key: string): string {
  return key.split(".")[0];
}

function permissionDescription(key: string): string {
  return `Allows ${key.replace(".", " ")}`;
}

interface SeedUser {
  email: string;
  name: string;
  kind: "USER" | "CLIENT";
  roleKeys: string[];
}

const SEED_USERS: SeedUser[] = [
  { email: "admin@example.com", name: "Owner", kind: "USER", roleKeys: ["OWNER"] },
  { email: "employee@example.com", name: "Employee", kind: "USER", roleKeys: ["EMPLOYEE"] },
  { email: "client@example.com", name: "Client", kind: "CLIENT", roleKeys: ["CLIENT"] },
];

// Development-only credentials. Never use these in production.
const SEED_PASSWORD = "Password123!";

async function main() {
  console.log("Seeding permissions...");
  const permissionKeys = ALL_PERMISSIONS.map((key) => key);

  const upsertedPermissions = new Map<string, string>();
  for (const key of permissionKeys) {
    const record = await prisma.permission.upsert({
      where: { key },
      create: { key, module: moduleOf(key), description: permissionDescription(key) },
      update: { module: moduleOf(key), description: permissionDescription(key) },
    });
    upsertedPermissions.set(key, record.id);
  }

  console.log("Seeding roles...");
  const roles: Array<{ key: string; name: string; description: string; permissions: PermissionKey[] }> = [
    { key: "OWNER", name: "Owner", description: "Full access to everything, including finance and system settings.", permissions: ALL_PERMISSIONS },
    { key: "ADMIN", name: "Admin", description: "Operational management without sensitive finance/system settings by default.", permissions: ADMIN_PERMISSIONS },
    { key: "PROJECT_MANAGER", name: "Project Manager", description: "Manages assigned projects, tasks, milestones and client communication.", permissions: PROJECT_MANAGER_PERMISSIONS },
    { key: "EMPLOYEE", name: "Employee", description: "Works on assigned tasks; sees only work-related information.", permissions: EMPLOYEE_PERMISSIONS },
    { key: "CLIENT", name: "Client", description: "Client portal access to own projects, files, approvals, invoices and payments.", permissions: CLIENT_PERMISSIONS },
  ];

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { key: role.key },
      create: { key: role.key, name: role.name, description: role.description, isSystem: true },
      update: { name: role.name, description: role.description },
    });

    for (const permKey of role.permissions) {
      const permissionId = upsertedPermissions.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: record.id, permissionId } },
        create: { roleId: record.id, permissionId },
        update: {},
      });
    }
  }

  console.log("Seeding users...");
  const passwordHash = await hashPassword(SEED_PASSWORD);
  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      create: {
        email: seedUser.email,
        name: seedUser.name,
        kind: seedUser.kind === "CLIENT" ? "CLIENT" : "USER",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash,
      },
      update: { name: seedUser.name, kind: seedUser.kind === "CLIENT" ? "CLIENT" : "USER", status: "ACTIVE" },
    });

    for (const roleKey of seedUser.roleKeys) {
      const role = await prisma.role.findUnique({ where: { key: roleKey } });
      if (!role) continue;
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }
  }

  console.log("Seeding business profile...");
  await prisma.businessProfile.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: "Shaan Studio",
      currency: "USD",
      timezone: "Asia/Dhaka",
      invoicePrefix: "INV",
    },
    update: {},
  });

  console.log("Seeding settings...");
  await prisma.setting.upsert({
    where: { key: "business.profile.seeded" },
    create: { key: "business.profile.seeded", value: true },
    update: { value: true },
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Development credentials (never use in production):");
  console.log("  admin@example.com   / Password123!   (Owner)");
  console.log("  employee@example.com / Password123!  (Employee)");
  console.log("  client@example.com   / Password123!  (Client)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
