import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  ApprovalsManager,
  type SerializedApproval,
} from "@/components/approvals/approvals-manager";

export const metadata: Metadata = { title: "Approvals" };

const STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);
const TYPES = new Set(["INVOICE", "EXPENSE", "MILESTONE"]);

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const user = await guardPermission("approvals.view");
  const { status, type } = await searchParams;

  const where = {
    deletedAt: null,
    ...(status && STATUSES.has(status) ? { status: status as "PENDING" } : {}),
    ...(type && TYPES.has(type) ? { type: type as "EXPENSE" } : {}),
  };

  const [approvals, counts] = await Promise.all([
    prisma.approval.findMany({
      where,
      include: {
        requestor: { select: { name: true } },
        decidedBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.approval.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const [invoices, expenses, milestones] = await Promise.all([
    prisma.invoice.findMany({
      where: { id: { in: approvals.filter((a) => a.type === "INVOICE").map((a) => a.entityId) }, deletedAt: null },
      select: { id: true, number: true, client: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { id: { in: approvals.filter((a) => a.type === "EXPENSE").map((a) => a.entityId) }, deletedAt: null },
      select: { id: true, description: true, merchant: true, client: { select: { name: true } } },
    }),
    prisma.milestone.findMany({
      where: { id: { in: approvals.filter((a) => a.type === "MILESTONE").map((a) => a.entityId) } },
      select: { id: true, title: true, project: { select: { id: true, name: true } } },
    }),
  ]);

  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  const expenseMap = new Map(expenses.map((e) => [e.id, e]));
  const milestoneMap = new Map(milestones.map((m) => [m.id, m]));

  const serialized: SerializedApproval[] = approvals.map((approval) => {
    let entityName = approval.entityId;
    let entityDetail: string | null = null;
    let entityLink = "/billing/expenses";

    if (approval.type === "INVOICE") {
      const invoice = invoiceMap.get(approval.entityId);
      if (invoice) {
        entityName = `Invoice ${invoice.number}`;
        entityDetail = invoice.client?.name ?? null;
        entityLink = `/billing/${invoice.id}`;
      }
    } else if (approval.type === "EXPENSE") {
      const expense = expenseMap.get(approval.entityId);
      if (expense) {
        entityName = expense.description ?? expense.merchant ?? "Expense";
        entityDetail = expense.client?.name ?? null;
      }
    } else if (approval.type === "MILESTONE") {
      const milestone = milestoneMap.get(approval.entityId);
      if (milestone) {
        entityName = milestone.title;
        entityDetail = milestone.project?.name ?? null;
        entityLink = `/projects/${milestone.project?.id ?? approval.entityId}`;
      }
    }

    return {
      id: approval.id,
      type: approval.type,
      status: approval.status,
      entityId: approval.entityId,
      entityName,
      entityDetail,
      entityLink,
      requestorName: approval.requestor?.name ?? null,
      comment: approval.comment,
      decidedByName: approval.decidedBy?.name ?? null,
      decidedAt: approval.decidedAt ? approval.decidedAt.toISOString() : null,
      createdAt: approval.createdAt.toISOString(),
    };
  });

  const countOf = (key: string) =>
    counts.find((c) => c.status === key)?._count._all ?? 0;

  return (
    <>
      <PageHeading title="Approvals" description="Review and decide pending approval requests." />
      <ApprovalsManager
        approvals={serialized}
        statusFilter={status && STATUSES.has(status) ? status : ""}
        typeFilter={type && TYPES.has(type) ? type : ""}
        pendingCount={countOf("PENDING")}
        approvedCount={countOf("APPROVED")}
        rejectedCount={countOf("REJECTED")}
        canManage={user.permissions.has("approvals.manage")}
      />
    </>
  );
}
