import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { removeStoredFile, saveUploadBytes } from "../src/lib/storage";

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
  "contractors.view", "contractors.create", "contractors.update", "contractors.delete",
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

  console.log("Seeding demo clients and leads...");
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  const clientUser = await prisma.user.findUnique({ where: { email: "client@example.com" } });

  interface DemoClient {
    email?: string;
    name: string;
    company?: string;
    kind: "BUSINESS" | "INDIVIDUAL";
    status: "ACTIVE" | "INACTIVE";
    phone?: string;
    website?: string;
    address?: string;
    notes?: string;
    portalUserId?: string;
  }

  const demoClients: DemoClient[] = [
    {
      email: "acme@example.com",
      name: "Acme Corporation",
      company: "Acme Corporation",
      kind: "BUSINESS" as const,
      status: "ACTIVE" as const,
      phone: "+1 555 0100",
      website: "https://acme.example.com",
      address: "100 Innovation Drive, Springfield",
      notes: "Long-term retainer client. Prefers weekly status calls.",
      portalUserId: clientUser?.id,
    },
    {
      email: "globex@example.com",
      name: "Globex Studios",
      company: "Globex Studios",
      kind: "BUSINESS" as const,
      status: "INACTIVE" as const,
      phone: "+1 555 0101",
      website: "https://globex.example.com",
      notes: "Paused work after budget review in Q3.",
    },
    {
      email: "dane.whitmore@example.com",
      name: "Dane Whitmore",
      kind: "INDIVIDUAL" as const,
      status: "ACTIVE" as const,
      phone: "+1 555 0102",
      notes: "Individual consultant. One-off project engagements.",
    },
  ];

  const clientIds = new Map<string, string>();
  for (const client of demoClients) {
    const email = client.email ?? `${client.name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
    const record = await prisma.client.upsert({
      where: { email },
      create: {
        name: client.name,
        email,
        company: client.company ?? (client.kind === "BUSINESS" ? client.name : null),
        phone: client.phone,
        website: client.website,
        address: client.address,
        notes: client.notes,
        kind: client.kind,
        status: client.status,
        portalUserId: client.portalUserId,
        accountManagerId: admin?.id,
      },
      update: {
        name: client.name,
        company: client.company ?? (client.kind === "BUSINESS" ? client.name : null),
        phone: client.phone,
        website: client.website,
        address: client.address,
        notes: client.notes,
        kind: client.kind,
        status: client.status,
        portalUserId: client.portalUserId,
        accountManagerId: admin?.id,
      },
    });
    clientIds.set(client.name, record.id);
  }

  const demoLeads = [
    {
      name: "Maria Gonzalez",
      email: "maria.gonzalez@example.com",
      company: "Brightline Media",
      source: "WEBSITE" as const,
      status: "NEW" as const,
      value: 250000,
      notes: "Requested proposal for brand refresh.",
    },
    {
      name: "John Carter",
      email: "john.carter@example.com",
      company: "Carter & Co",
      source: "REFERRAL" as const,
      status: "CONTACTED" as const,
      value: 900000,
      notes: "Referred by Acme Corporation.",
    },
    {
      name: "Priya Sharma",
      email: "priya.sharma@example.com",
      source: "SOCIAL_MEDIA" as const,
      status: "QUALIFIED" as const,
      value: 450000,
      notes: "Needs e-commerce platform migration.",
    },
    {
      name: "TomÃ¡s Rivera",
      email: "tomas.rivera@example.com",
      company: "Rivera Logistics",
      source: "EMAIL" as const,
      status: "PROPOSAL" as const,
      value: 1200000,
      notes: "Proposal for fleet management dashboard sent.",
    },
  ];

  for (const lead of demoLeads) {
    const existing = lead.email
      ? await prisma.lead.findFirst({ where: { email: lead.email } })
      : null;
    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: lead.name,
          company: lead.company,
          source: lead.source,
          status: lead.status,
          value: lead.value,
          notes: lead.notes,
          assigneeId: admin?.id,
        },
      });
      continue;
    }
    await prisma.lead.create({
      data: {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        source: lead.source,
        status: lead.status,
        value: lead.value,
        notes: lead.notes,
        assigneeId: admin?.id,
      },
    });
  }

  console.log("Seeding demo projects and milestones...");
  const acmeId = clientIds.get("Acme Corporation");
  const globexId = clientIds.get("Globex Studios");
  const daneId = clientIds.get("Dane Whitmore");

  interface DemoMilestone {
    title: string;
    description?: string;
    status: "PENDING" | "COMPLETED";
    dueDate?: Date;
  }

  interface DemoProject {
    name: string;
    description?: string;
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
    priority: "LOW" | "MEDIUM" | "HIGH";
    clientId?: string;
    budget?: number;
    startDate?: Date;
    deadline?: Date;
    notes?: string;
    milestones: DemoMilestone[];
  }

  const demoProjects: DemoProject[] = [
    {
      name: "Website Redesign",
      description:
        "Full redesign of the Acme Corporation marketing website, including a new CMS and content migration.",
      status: "ACTIVE",
      priority: "HIGH",
      clientId: acmeId,
      budget: 1200000,
      startDate: new Date("2026-06-01"),
      deadline: new Date("2026-10-15"),
      notes: "Weekly status call every Monday. Point of contact: Dana at Acme.",
      milestones: [
        { title: "Discovery & audit", status: "COMPLETED", dueDate: new Date("2026-06-15") },
        { title: "Design phase", status: "COMPLETED", dueDate: new Date("2026-07-20") },
        { title: "Development", description: "Page templates and CMS build-out.", status: "PENDING", dueDate: new Date("2026-09-15") },
        { title: "Launch", status: "PENDING", dueDate: new Date("2026-10-15") },
      ],
    },
    {
      name: "Brand Refresh",
      description: "Visual identity refresh for Globex Studios, paused after their budget review.",
      status: "ON_HOLD",
      priority: "MEDIUM",
      clientId: globexId,
      budget: 250000,
      startDate: new Date("2026-05-01"),
      deadline: new Date("2026-09-01"),
      milestones: [
        { title: "Moodboards", status: "COMPLETED", dueDate: new Date("2026-05-20") },
      ],
    },
    {
      name: "Internal CRM Tools",
      description: "In-house tooling to consolidate client records and reporting across teams.",
      status: "ACTIVE",
      priority: "HIGH",
      budget: 900000,
      startDate: new Date("2026-04-15"),
      deadline: new Date("2026-08-31"),
      notes: "Internal project, no client billing.",
      milestones: [
        { title: "Backend API", status: "COMPLETED", dueDate: new Date("2026-06-30") },
        { title: "Admin UI", status: "COMPLETED", dueDate: new Date("2026-07-31") },
        { title: "Client portal", status: "PENDING", dueDate: new Date("2026-08-31") },
      ],
    },
    {
      name: "Fleet Dashboard",
      description: "Fleet management dashboard for Rivera Logistics via Dane Whitmore.",
      status: "PLANNING",
      priority: "MEDIUM",
      clientId: daneId,
      budget: 1200000,
      startDate: new Date("2026-09-01"),
      deadline: new Date("2027-01-31"),
      milestones: [
        { title: "Requirements", status: "PENDING", dueDate: new Date("2026-09-20") },
      ],
    },
  ];

  for (const project of demoProjects) {
    const existing = await prisma.project.findFirst({
      where: { name: project.name, deletedAt: null },
    });
    const data = {
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      clientId: project.clientId,
      managerId: admin?.id,
      budget: project.budget,
      startDate: project.startDate,
      deadline: project.deadline,
      notes: project.notes,
    };
    const record = existing
      ? await prisma.project.update({ where: { id: existing.id }, data })
      : await prisma.project.create({ data });

    for (const milestone of project.milestones) {
      const existingMilestone = await prisma.milestone.findFirst({
        where: { projectId: record.id, title: milestone.title },
      });
      if (existingMilestone) {
        await prisma.milestone.update({
          where: { id: existingMilestone.id },
          data: {
            description: milestone.description,
            status: milestone.status,
            dueDate: milestone.dueDate,
            completedAt: milestone.status === "COMPLETED" ? new Date() : null,
          },
        });
        continue;
      }
      await prisma.milestone.create({
        data: {
          projectId: record.id,
          title: milestone.title,
          description: milestone.description,
          status: milestone.status,
          dueDate: milestone.dueDate,
          completedAt: milestone.status === "COMPLETED" ? new Date() : null,
        },
      });
    }
  }

  console.log("Seeding demo tasks...");
  const employee = await prisma.user.findUnique({ where: { email: "employee@example.com" } });
  const projectsByName = new Map<string, string>();
  for (const project of demoProjects) {
    const record = await prisma.project.findFirst({
      where: { name: project.name, deletedAt: null },
      select: { id: true },
    });
    if (record) projectsByName.set(project.name, record.id);
  }

  interface DemoTask {
    title: string;
    description?: string;
    status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH";
    projectName?: string;
    assigneeId?: string;
    dueDate?: Date;
    estimatedHours?: number;
  }

  const demoTasks: DemoTask[] = [
    {
      title: "Homepage hero section",
      description: "Build the new hero with the approved motion design.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectName: "Website Redesign",
      assigneeId: employee?.id,
      dueDate: new Date("2026-08-20"),
      estimatedHours: 12,
    },
    {
      title: "Content migration",
      description: "Move all legacy pages into the new CMS structure.",
      status: "TODO",
      priority: "MEDIUM",
      projectName: "Website Redesign",
      assigneeId: employee?.id,
      dueDate: new Date("2026-09-05"),
      estimatedHours: 20,
    },
    {
      title: "Migrate client records",
      description: "Consolidate duplicate client records from the old sheet.",
      status: "IN_REVIEW",
      priority: "HIGH",
      projectName: "Internal CRM Tools",
      assigneeId: admin?.id,
      dueDate: new Date("2026-08-25"),
      estimatedHours: 8,
    },
    {
      title: "Design approval sign-off",
      status: "TODO",
      priority: "LOW",
      projectName: "Brand Refresh",
      assigneeId: admin?.id,
      dueDate: new Date("2026-09-10"),
      estimatedHours: 2,
    },
    {
      title: "Requirements workshop notes",
      description: "Summarise decisions from the fleet dashboard workshop.",
      status: "DONE",
      priority: "MEDIUM",
      projectName: "Fleet Dashboard",
      assigneeId: admin?.id,
      dueDate: new Date("2026-08-30"),
      estimatedHours: 4,
    },
  ];

  for (const task of demoTasks) {
    const existing = await prisma.task.findFirst({
      where: { title: task.title, deletedAt: null },
    });
    const data = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectId: task.projectName ? projectsByName.get(task.projectName) ?? null : null,
      assigneeId: task.assigneeId,
      createdById: admin?.id,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      completedAt: task.status === "DONE" ? new Date() : null,
    };
    if (existing) {
      await prisma.task.update({ where: { id: existing.id }, data });
    } else {
      await prisma.task.create({ data });
    }
  }

  console.log("Seeding demo invoices and payments...");
  interface DemoItem {
    description: string;
    quantity: number;
    unitPriceCents: number;
  }
  interface DemoInvoice {
    number: string;
    clientId?: string;
    status: "DRAFT" | "SENT" | "PAID" | "VOID";
    issueDate: Date;
    dueDate?: Date;
    taxRateBps: number;
    notes?: string;
    items: DemoItem[];
    payments?: Array<{ amountCents: number; method: "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "OTHER"; paidAt: Date; reference?: string }>;
  }

  const demoInvoices: DemoInvoice[] = [
    {
      number: "INV-0001",
      clientId: acmeId,
      status: "SENT",
      issueDate: new Date("2026-07-01"),
      dueDate: new Date("2026-08-01"),
      taxRateBps: 500,
      notes: "Covers the design phase and July retainer.",
      items: [
        { description: "Website redesign â€” design phase", quantity: 1, unitPriceCents: 600000 },
        { description: "Monthly retainer â€” July", quantity: 1, unitPriceCents: 150000 },
      ],
    },
    {
      number: "INV-0002",
      clientId: daneId,
      status: "PAID",
      issueDate: new Date("2026-06-15"),
      dueDate: new Date("2026-07-15"),
      taxRateBps: 0,
      notes: "One-off consulting engagement.",
      items: [
        { description: "Consulting â€” requirements workshop", quantity: 1, unitPriceCents: 400000 },
      ],
      payments: [
        { amountCents: 400000, method: "BANK_TRANSFER", paidAt: new Date("2026-06-20"), reference: "WIRE-8812" },
      ],
    },
  ];

  for (const invoice of demoInvoices) {
    const subtotalCents = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0,
    );
    const taxCents = Math.round((subtotalCents * invoice.taxRateBps) / 10000);
    const totalCents = subtotalCents + taxCents;

    const record = await prisma.invoice.upsert({
      where: { number: invoice.number },
      create: {
        number: invoice.number,
        clientId: invoice.clientId,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        taxRateBps: invoice.taxRateBps,
        subtotalCents,
        taxCents,
        totalCents,
        notes: invoice.notes,
        createdById: admin?.id,
      },
      update: {
        clientId: invoice.clientId,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        taxRateBps: invoice.taxRateBps,
        subtotalCents,
        taxCents,
        totalCents,
        notes: invoice.notes,
        createdById: admin?.id,
      },
    });

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: record.id } });
    await prisma.payment.deleteMany({ where: { invoiceId: record.id } });

    for (const item of invoice.items) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: record.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          amountCents: item.quantity * item.unitPriceCents,
        },
      });
    }
    for (const payment of invoice.payments ?? []) {
      await prisma.payment.create({
        data: {
          invoiceId: record.id,
          amountCents: payment.amountCents,
          method: payment.method,
          paidAt: payment.paidAt,
          reference: payment.reference,
          recordedById: admin?.id,
        },
      });
    }
  }

  await prisma.businessProfile.update({
    where: { id: "default" },
    data: { invoiceNextNumber: 3 },
  });

  console.log("Seeding demo expenses...");
  const demoExpenseDescriptions = [
    "Hosting + monitoring (6 months)",
    "Figma subscription â€” Q3",
    "External monitor + laptop stand",
    "Client site visit â€” taxi",
    "Team lunch after kickoff",
    "Accounting services â€” quarterly",
  ];
  const demoExpenses = [
    { description: "Hosting + monitoring (6 months)", amountCents: 120000, category: "SOFTWARE" as const, merchant: "Vercel", incurredAt: new Date("2026-07-05") },
    { description: "Figma subscription â€” Q3", amountCents: 24000, category: "SOFTWARE" as const, merchant: "Figma", incurredAt: new Date("2026-07-02") },
    { description: "External monitor + laptop stand", amountCents: 89900, category: "HARDWARE" as const, merchant: "Best Buy", incurredAt: new Date("2026-06-18") },
    { description: "Client site visit â€” taxi", amountCents: 15000, category: "TRAVEL" as const, merchant: "Uber", incurredAt: new Date("2026-06-10") },
    { description: "Team lunch after kickoff", amountCents: 8500, category: "MEALS" as const, merchant: "Local Bistro", incurredAt: new Date("2026-06-25") },
    { description: "Accounting services â€” quarterly", amountCents: 50000, category: "SERVICES" as const, merchant: "ClearBooks", incurredAt: new Date("2026-05-28") },
  ];

  await prisma.expense.deleteMany({
    where: { description: { in: demoExpenseDescriptions } },
  });
  for (const expense of demoExpenses) {
    await prisma.expense.create({
      data: {
        amountCents: expense.amountCents,
        category: expense.category,
        merchant: expense.merchant,
        description: expense.description,
        incurredAt: expense.incurredAt,
        recordedById: admin?.id,
      },
    });
  }

  console.log("Seeding demo conversations...");
  const demoConversations: Array<{
    clientId?: string;
    subject: string;
    createdById?: string;
    messages: Array<{ senderKind: "USER" | "CLIENT"; senderId?: string; body: string }>;
  }> = [
    {
      clientId: acmeId,
      subject: "Website redesign kickoff",
      createdById: admin?.id,
      messages: [
        {
          senderKind: "USER",
          senderId: admin?.id,
          body: "Hi Dana, welcome! Here is the kickoff agenda for the website redesign.",
        },
        {
          senderKind: "CLIENT",
          senderId: clientUser?.id,
          body: "Thanks! We are excited â€” the design phase progress looks great so far.",
        },
        {
          senderKind: "USER",
          senderId: admin?.id,
          body: "We will share the first page templates with you on Friday.",
        },
      ],
    },
    {
      clientId: daneId,
      subject: "Fleet dashboard requirements",
      createdById: admin?.id,
      messages: [
        {
          senderKind: "USER",
          senderId: admin?.id,
          body: "Sharing the workshop notes from Monday so we are aligned before kickoff.",
        },
      ],
    },
  ];

  for (const conversation of demoConversations) {
    if (!conversation.clientId) continue;
    const existing = await prisma.conversation.findFirst({
      where: { clientId: conversation.clientId, subject: conversation.subject, deletedAt: null },
    });
    if (existing) continue;

    const lastMessageAt = new Date(Date.UTC(2026, 7, 10 + conversation.messages.length));
    await prisma.conversation.create({
      data: {
        clientId: conversation.clientId,
        subject: conversation.subject,
        createdById: conversation.createdById,
        lastMessageAt,
        messages: {
          create: conversation.messages.map((message, index) => ({
            senderKind: message.senderKind,
            senderId: message.senderId,
            body: message.body,
            createdAt: new Date(Date.UTC(2026, 7, 10 + index)),
          })),
        },
      },
    });
  }

  console.log("Seeding demo approvals...");
  const demoExpenseForApproval = await prisma.expense.findFirst({
    where: { description: "Hosting + monitoring (6 months)" },
  });
  if (demoExpenseForApproval) {
    await prisma.approval.upsert({
      where: { type_entityId: { type: "EXPENSE", entityId: demoExpenseForApproval.id } },
      create: {
        type: "EXPENSE",
        entityId: demoExpenseForApproval.id,
        status: "PENDING",
        requestorId: admin?.id,
        comment: "Annual hosting renewal â€” needs sign-off before paying.",
      },
      update: {},
    });
  }

  const demoInvoiceForApproval = await prisma.invoice.findFirst({
    where: { number: "INV-0002" },
  });
  if (demoInvoiceForApproval) {
    await prisma.approval.upsert({
      where: { type_entityId: { type: "INVOICE", entityId: demoInvoiceForApproval.id } },
      create: {
        type: "INVOICE",
        entityId: demoInvoiceForApproval.id,
        status: "APPROVED",
        requestorId: admin?.id,
        decidedById: admin?.id,
        decidedAt: new Date("2026-06-14"),
        comment: "Approved before sending to the client.",
      },
      update: {},
    });
  }

  console.log("Seeding demo time entries...");
  const demoTimeNotes = [
    "Reviewing brand concepts",
    "Summarising workshop decisions",
    "Consolidating duplicate client records",
    "Internal team sync",
  ];
  await prisma.timeEntry.deleteMany({ where: { note: { in: demoTimeNotes } } });

  const designTask = await prisma.task.findFirst({ where: { title: "Design approval sign-off" } });
  const workshopTask = await prisma.task.findFirst({
    where: { title: "Requirements workshop notes" },
  });
  const migrateTask = await prisma.task.findFirst({ where: { title: "Migrate client records" } });

  const demoTimeEntries = [
    {
      userId: admin?.id,
      taskId: designTask?.id ?? null,
      minutes: 120,
      date: new Date("2026-08-12"),
      note: "Reviewing brand concepts",
    },
    {
      userId: employee?.id,
      taskId: workshopTask?.id ?? null,
      minutes: 240,
      date: new Date("2026-08-11"),
      note: "Summarising workshop decisions",
    },
    {
      userId: employee?.id,
      taskId: migrateTask?.id ?? null,
      minutes: 180,
      date: new Date("2026-08-08"),
      note: "Consolidating duplicate client records",
    },
    {
      userId: admin?.id,
      taskId: null,
      minutes: 60,
      date: new Date("2026-08-13"),
      note: "Internal team sync",
    },
  ];
  for (const entry of demoTimeEntries) {
    if (!entry.userId) continue;
    await prisma.timeEntry.create({
      data: {
        userId: entry.userId,
        taskId: entry.taskId,
        minutes: entry.minutes,
        date: entry.date,
        note: entry.note,
      },
    });
  }

  console.log("Seeding demo calendar events...");
  const demoEventTitles = [
    "Website redesign kickoff",
    "Fleet dashboard review",
    "Quarterly planning offsite",
    "Team standup",
  ];
  await prisma.calendarEvent.deleteMany({
    where: { title: { in: demoEventTitles } },
  });

  const redesignProject = projectsByName.get("Website Redesign");
  const fleetProject = projectsByName.get("Fleet Dashboard");
  const daneClient = await prisma.client.findFirst({ where: { name: "Dane Whitmore" } });

  const demoEvents = [
    {
      title: "Website redesign kickoff",
      description: "Design phase kickoff with the Acme team.",
      location: "Video call",
      startsAt: new Date(2026, 7, 18, 10, 0),
      endsAt: new Date(2026, 7, 18, 11, 0),
      allDay: false,
      projectId: redesignProject ?? null,
      clientId: null,
      createdById: admin?.id,
    },
    {
      title: "Fleet dashboard review",
      description: "Walk through the workshop decisions with Dane.",
      startsAt: new Date(2026, 7, 19, 14, 0),
      endsAt: new Date(2026, 7, 19, 15, 0),
      allDay: false,
      projectId: fleetProject ?? null,
      clientId: daneClient?.id ?? null,
      createdById: admin?.id,
    },
    {
      title: "Quarterly planning offsite",
      description: "All-day planning session.",
      location: "Meeting room 2",
      startsAt: new Date(2026, 7, 21, 9, 0),
      endsAt: new Date(2026, 7, 21, 17, 0),
      allDay: true,
      projectId: null,
      clientId: null,
      createdById: admin?.id,
    },
    {
      title: "Team standup",
      startsAt: new Date(2026, 7, 14, 9, 30),
      endsAt: new Date(2026, 7, 14, 9, 45),
      allDay: false,
      projectId: null,
      clientId: null,
      createdById: admin?.id,
    },
  ];
  for (const event of demoEvents) {
    await prisma.calendarEvent.create({ data: event });
  }

  console.log("Seeding demo contractors...");
  const demoContractorEmails = [
    "ravi.menon@example.com",
    "sofia.marchetti@example.com",
    "kurt.baker@example.com",
  ];
  await prisma.contractor.deleteMany({
    where: { email: { in: demoContractorEmails } },
  });

  const ctrRedesignProject = projectsByName.get("Website Redesign");
  const ctrBrandRefreshProject = projectsByName.get("Brand Refresh");
  const ctrCrmProject = projectsByName.get("Internal CRM Tools");
  const ctrFleetProject = projectsByName.get("Fleet Dashboard");

  const demoContractors = [
    {
      name: "Ravi Menon",
      email: "ravi.menon@example.com",
      phone: "+1 555 111 2233",
      company: "Menon Engineering",
      specialty: "Frontend engineering",
      rate: 7500,
      status: "ACTIVE" as const,
      notes: "React + TypeScript specialist. Available evenings ET.",
      projectIds: [ctrRedesignProject, ctrCrmProject].filter((id): id is string => Boolean(id)),
    },
    {
      name: "Sofia Marchetti",
      email: "sofia.marchetti@example.com",
      phone: "+1 555 444 5566",
      company: "Studio Marchetti",
      specialty: "UI / brand design",
      rate: 8500,
      status: "ACTIVE" as const,
      notes: "Lead visual design for brand engagements.",
      projectIds: [ctrRedesignProject, ctrBrandRefreshProject].filter((id): id is string => Boolean(id)),
    },
    {
      name: "Kurt Baker",
      email: "kurt.baker@example.com",
      phone: "+1 555 777 8899",
      company: "Baker QA Labs",
      specialty: "Quality assurance",
      rate: 4500,
      status: "INACTIVE" as const,
      notes: "Manual QA for dashboards. On standby.",
      projectIds: [ctrFleetProject].filter((id): id is string => Boolean(id)),
    },
  ];
  for (const contractor of demoContractors) {
    await prisma.contractor.create({
      data: {
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone,
        company: contractor.company,
        specialty: contractor.specialty,
        rate: contractor.rate,
        status: contractor.status,
        notes: contractor.notes,
        createdById: admin?.id,
        assignments: {
          create: contractor.projectIds.map((projectId) => ({ projectId })),
        },
      },
    });
  }

  console.log("Seeding demo shared files...");
  const demoFileNames = [
    "website-redesign-brief.txt",
    "fleet-dashboard-notes.txt",
    "brand-guidelines.txt",
  ];
  const existingFiles = await prisma.sharedFile.findMany({
    where: { name: { in: demoFileNames } },
    select: { id: true, storageKey: true },
  });
  for (const file of existingFiles) {
    await prisma.sharedFile.delete({ where: { id: file.id } });
    await removeStoredFile(file.storageKey);
  }

  const employeeUploader =
    await prisma.user.findUnique({ where: { email: "employee@example.com" } });
  const brandRefreshProject = projectsByName.get("Brand Refresh");
  const demoFiles = [
    {
      name: "website-redesign-brief.txt",
      content:
        "Website Redesign â€” project brief\n\nScope: full site redesign for Acme Corporation.\n" +
        "Target launch: end of Q3.\n\nStakeholders:\n- Acme marketing team\n- Shaan Studio delivery\n\nKey pages:\n- Homepage\n- Services\n- Case studies\n- Contact\n".repeat(2),
      projectId: redesignProject ?? null,
      clientId: daneClient?.id ?? null,
      uploadedById: admin?.id,
      mimeType: "text/plain",
    },
    {
      name: "fleet-dashboard-notes.txt",
      content:
        "Fleet Dashboard â€” workshop notes\n\nDecisions from the 19 Aug workshop:\n- Metric tiles: uptime, fuel spend, trips\n- Alerts pushed to Slack\n- Export CSV per vehicle\n\nOpen questions:\n- Logo placement\n- Dark mode scope\n".repeat(2),
      projectId: fleetProject ?? null,
      clientId: null,
      uploadedById: employeeUploader?.id ?? admin?.id,
      mimeType: "text/plain",
    },
    {
      name: "brand-guidelines.txt",
      content:
        "Brand Refresh â€” guidelines\n\nPrimary palette:\n- Ink #1B1B1F\n- Accent #6C5CE7\nTypography: Inter for web, Avenir for print.\n\nUsage rules:\n- Never stretch the logo\n- Minimum clear space = icon height\n".repeat(2),
      projectId: brandRefreshProject ?? null,
      clientId: null,
      uploadedById: employeeUploader?.id ?? admin?.id,
      mimeType: "text/plain",
    },
  ];
  for (const file of demoFiles) {
    const bytes = Buffer.from(file.content, "utf-8");
    const storageKey = await saveUploadBytes(new Uint8Array(bytes));
    await prisma.sharedFile.create({
      data: {
        name: file.name,
        storageKey,
        mimeType: file.mimeType,
        size: bytes.length,
        projectId: file.projectId,
        clientId: file.clientId,
        uploadedById: file.uploadedById,
      },
    });
  }

  console.log("Seeding demo notifications...");
  const demoNotificationTitles = [
    "Demo — Approval requested",
    "Demo — New file shared with you",
    "Demo — Task assigned to you",
  ];
  await prisma.notification.deleteMany({ where: { title: { in: demoNotificationTitles } } });

  const clientPortalUser =
    await prisma.user.findUnique({ where: { email: "client@example.com" } });
  const demoNotifications = [
    {
      userId: admin?.id ?? "",
      kind: "APPROVAL" as const,
      title: "Demo — Approval requested",
      body: "Invoice INV-0001 from Acme Corporation",
      link: "/approvals",
      entityType: "Approval",
    },
    {
      userId: admin?.id ?? "",
      kind: "TASK" as const,
      title: "Demo — Task assigned to you",
      body: "Prepare weekly client status report",
      link: "/tasks",
      entityType: "Task",
    },
    {
      userId: clientPortalUser?.id ?? "",
      kind: "FILE" as const,
      title: "Demo — New file shared with you",
      body: "website-redesign-brief.txt",
      link: "/c/files",
      entityType: "SharedFile",
    },
  ];
  for (const notification of demoNotifications) {
    if (!notification.userId) continue;
    await prisma.notification.create({ data: notification });
  }

  console.log("Seeding demo audit entries...");
  const demoAuditSummaries = [
    "Demo sign-in",
    "Demo client created: Acme Corporation",
    "Demo workspace settings updated",
  ];
  await prisma.auditLog.deleteMany({ where: { summary: { in: demoAuditSummaries } } });

  const adminActorId = admin?.id;
  if (adminActorId) {
    const now = new Date();
    await prisma.auditLog.createMany({
      data: [
        {
          actorId: adminActorId,
          action: "LOGIN",
          entity: "User",
          summary: "Demo sign-in",
          ip: "127.0.0.1",
          createdAt: new Date(now.getTime() - 2 * 86_400_000),
        },
        {
          actorId: adminActorId,
          action: "CREATE",
          entity: "Client",
          summary: "Demo client created: Acme Corporation",
          ip: "127.0.0.1",
          createdAt: new Date(now.getTime() - 1 * 86_400_000),
        },
        {
          actorId: adminActorId,
          action: "SETTINGS_CHANGE",
          entity: "BusinessProfile",
          summary: "Demo workspace settings updated",
          ip: "127.0.0.1",
          createdAt: new Date(now.getTime() - 3 * 3_600_000),
        },
      ],
    });
  }

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
