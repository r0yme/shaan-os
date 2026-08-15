import { prisma } from "@/lib/db";
import {
  formatClientContext,
  formatLeadContext,
  formatProjectContext,
  modeSupportsEntity,
} from "@/lib/ai";
import { NotFoundError } from "@/lib/errors";
import { InvoiceStatus } from "@/generated/prisma/enums";

export type AiEntityType = "client" | "project" | "lead";

export { modeSupportsEntity };

export async function loadAiContext(entityType: AiEntityType, entityId: string): Promise<string> {
  if (entityType === "client") {
    const client = await prisma.client.findFirst({
      where: { id: entityId, deletedAt: null },
      select: {
        name: true,
        company: true,
        email: true,
        phone: true,
        address: true,
        notes: true,
        status: true,
        kind: true,
        accountManager: { select: { name: true } },
        _count: { select: { projects: { where: { deletedAt: null } } } },
        invoices: {
          where: { deletedAt: null, status: InvoiceStatus.SENT },
          select: { totalCents: true },
        },
      },
    });
    if (!client) throw new NotFoundError("Client not found.");
    return formatClientContext({
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      status: client.status,
      kind: client.kind,
      accountManager: client.accountManager?.name,
      projectCount: client._count.projects,
      openInvoiceCount: client.invoices.length,
      outstandingCents: client.invoices.reduce((sum, i) => sum + i.totalCents, 0),
    });
  }

  if (entityType === "project") {
    const project = await prisma.project.findFirst({
      where: { id: entityId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        budget: true,
        startDate: true,
        deadline: true,
        notes: true,
        client: { select: { name: true } },
        manager: { select: { name: true } },
        _count: {
          select: {
            milestones: {
              where: { status: "COMPLETED" },
            },
            tasks: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!project) throw new NotFoundError("Project not found.");
    const milestoneCount = await prisma.milestone.count({
      where: { projectId: project.id },
    });
    const openTaskCount = await prisma.task.count({
      where: {
        projectId: project.id,
        deletedAt: null,
        status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] },
      },
    });
    return formatProjectContext({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      client: project.client?.name,
      manager: project.manager?.name,
      budgetCents: project.budget,
      startDate: project.startDate?.toISOString(),
      deadline: project.deadline?.toISOString(),
      notes: project.notes,
      milestoneCount,
      completedMilestones: project._count.milestones,
      taskCount: project._count.tasks,
      openTaskCount,
    });
  }

  const lead = await prisma.lead.findFirst({
    where: { id: entityId, deletedAt: null },
      select: {
        id: true,
        name: true,
      email: true,
      phone: true,
      company: true,
      source: true,
      status: true,
      value: true,
      notes: true,
      assignee: { select: { name: true } },
      createdAt: true,
    },
  });
  if (!lead) throw new NotFoundError("Lead not found.");
  return formatLeadContext({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
    status: lead.status,
    valueCents: lead.value,
    notes: lead.notes,
    assignee: lead.assignee?.name,
    ageDays: Math.max(0, Math.floor((Date.now() - lead.createdAt.getTime()) / 86_400_000)),
  });
}
