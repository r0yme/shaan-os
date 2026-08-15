import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { BillingTabs } from "@/components/billing/billing-tabs";
import {
  ExpensesManager,
  type SerializedExpense,
} from "@/components/billing/expenses-manager";
import { ExpenseCategory } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Expenses" };

const CATEGORIES = new Set<string>([
  "SOFTWARE",
  "HARDWARE",
  "SERVICES",
  "TRAVEL",
  "MEALS",
  "OFFICE",
  "OTHER",
]);

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await guardPermission("expenses.view");
  const { category } = await searchParams;

  const [expenses, projects, clients] = await Promise.all([
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        ...(category && CATEGORIES.has(category) ? { category: category as ExpenseCategory } : {}),
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: [{ incurredAt: "desc" }],
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const allExpenses = await prisma.expense.findMany({
    where: { deletedAt: null },
    select: { amountCents: true, incurredAt: true },
  });
  const monthCents = allExpenses
    .filter((e) => e.incurredAt >= monthStart)
    .reduce((sum, e) => sum + e.amountCents, 0);
  const yearCents = allExpenses
    .filter((e) => e.incurredAt >= yearStart)
    .reduce((sum, e) => sum + e.amountCents, 0);
  const allTimeCents = allExpenses.reduce((sum, e) => sum + e.amountCents, 0);

  const serialized: SerializedExpense[] = expenses.map((expense) => ({
    id: expense.id,
    amountCents: expense.amountCents,
    category: expense.category,
    merchant: expense.merchant,
    description: expense.description,
    incurredAt: expense.incurredAt ? expense.incurredAt.toISOString() : null,
    projectId: expense.projectId,
    projectName: expense.project?.name ?? null,
    clientId: expense.clientId,
    clientName: expense.client?.name ?? null,
    recordedByName: expense.recordedBy?.name ?? null,
    createdAt: expense.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading title="Expenses" description="Track business spending." />
      <BillingTabs active="expenses" />
      <ExpensesManager
        expenses={serialized}
        categoryFilter={category && CATEGORIES.has(category) ? category : ""}
        monthCents={monthCents}
        yearCents={yearCents}
        allTimeCents={allTimeCents}
        count={expenses.length}
        projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
        canCreate={user.permissions.has("expenses.create")}
        canEdit={user.permissions.has("expenses.update")}
        canDelete={user.permissions.has("expenses.delete")}
      />
    </>
  );
}
