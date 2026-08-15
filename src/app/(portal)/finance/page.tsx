import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Banknote, CheckCircle2, Receipt, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { sinceForRange } from "@/lib/reports";
import { MetricCard } from "@/components/reports/metric-card";
import { RangePicker } from "@/components/reports/range-picker";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { InvoiceStatusBadge } from "@/components/billing/status-badges";
import { InvoiceStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Finance" };

const CATEGORY_LABELS: Record<string, string> = {
  SOFTWARE: "Software",
  HARDWARE: "Hardware",
  SERVICES: "Services",
  TRAVEL: "Travel",
  MEALS: "Meals",
  OFFICE: "Office",
  OTHER: "Other",
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await guardPermission("finance.view");
  const { range } = await searchParams;
  const since = sinceForRange(range);

  const paymentWhere = since ? { paidAt: { gte: since } } : {};
  const expenseWhere = { deletedAt: null, ...(since ? { incurredAt: { gte: since } } : {}) };

  const [payments, unpaidInvoices, expenses, pendingApprovals] = await Promise.all([
    prisma.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        amountCents: true,
        paidAt: true,
        invoice: {
          select: {
            number: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, status: InvoiceStatus.SENT },
      select: {
        id: true,
        number: true,
        totalCents: true,
        dueDate: true,
        status: true,
        client: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: { amountCents: true, category: true },
    }),
    prisma.approval.count({ where: { deletedAt: null, status: "PENDING" } }),
  ]);

  const revenue = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const outstanding = unpaidInvoices.reduce((sum, i) => sum + i.totalCents, 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const net = revenue - expenseTotal;

  const categoryTotals = new Map<string, number>();
  for (const expense of expenses) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amountCents);
  }
  const categoryRows = Array.from(categoryTotals.entries())
    .map(([category, total]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const recentPayments = payments.slice(0, 10);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeading
          title="Finance"
          description={
            range === "all"
              ? "Cash position, unpaid invoices and spending across all time."
              : "Cash position, unpaid invoices and spending for the selected period."
          }
        />
        <RangePicker range={range ?? "30"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Revenue collected"
          value={formatCurrency(revenue / 100)}
          icon={Banknote}
          tone="positive"
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(outstanding / 100)}
          icon={Receipt}
          tone="negative"
        />
        <MetricCard label="Expenses" value={formatCurrency(expenseTotal / 100)} icon={Wallet} />
        <MetricCard
          label="Net"
          value={formatCurrency(net / 100)}
          icon={Activity}
          tone={net >= 0 ? "positive" : "negative"}
        />
        <MetricCard
          label="Pending approvals"
          value={String(pendingApprovals)}
          icon={CheckCircle2}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unpaid invoices
            </CardTitle>
            <CardDescription>Invoices sent but not yet paid, oldest due first.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "invoice",
                  header: "Invoice",
                  cell: (row) => (
                    <Link
                      href={`/billing/${row.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {row.number}
                    </Link>
                  ),
                },
                {
                  key: "client",
                  header: "Client",
                  cell: (row) => <span className="text-muted-foreground">{row.client?.name ?? "—"}</span>,
                },
                {
                  key: "due",
                  header: "Due",
                  cell: (row) => (
                    <span className="text-muted-foreground">
                      {row.dueDate ? formatDate(row.dueDate) : "—"}
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  cell: (row) => (
                    <span className="font-medium text-foreground">
                      {formatCurrency(row.totalCents / 100)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => <InvoiceStatusBadge status={row.status} />,
                },
              ]}
              data={unpaidInvoices}
              keyExtractor={(row) => row.id}
              emptyTitle="No unpaid invoices"
              emptyDescription="Invoices you send appear here until they are paid."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent payments
            </CardTitle>
            <CardDescription>The latest payments recorded in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "date",
                  header: "Date",
                  cell: (row) => <span className="text-muted-foreground">{formatDate(row.paidAt)}</span>,
                },
                {
                  key: "invoice",
                  header: "Invoice",
                  cell: (row) => (
                    <span className="font-medium text-foreground">{row.invoice?.number ?? "—"}</span>
                  ),
                },
                {
                  key: "client",
                  header: "Client",
                  cell: (row) => (
                    <span className="text-muted-foreground">{row.invoice?.client?.name ?? "—"}</span>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  cell: (row) => (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.amountCents / 100)}
                    </span>
                  ),
                },
              ]}
              data={recentPayments}
              keyExtractor={(row) => row.id}
              emptyTitle="No payments yet"
              emptyDescription="Payments you record on invoices appear here."
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spending by category
            </CardTitle>
            <CardDescription>Expenses grouped by category for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "category",
                  header: "Category",
                  cell: (row) => <span className="font-medium text-foreground">{row.label}</span>,
                },
                {
                  key: "total",
                  header: "Total",
                  cell: (row) => <span className="text-foreground">{formatCurrency(row.total / 100)}</span>,
                },
              ]}
              data={categoryRows}
              keyExtractor={(row) => row.category}
              emptyTitle="No expenses yet"
              emptyDescription="Expenses you log appear here by category."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
