import type { Metadata } from "next";
import {
  Activity,
  Banknote,
  FileText,
  FolderKanban,
  Receipt,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatCurrency } from "@/lib/utils";
import { buildMonthSeries, sinceForRange, sumByMonth } from "@/lib/reports";
import type { BarDatum } from "@/components/reports/bar-chart";
import { VerticalBars, HorizontalBars } from "@/components/reports/bar-chart";
import { MetricCard } from "@/components/reports/metric-card";
import { RangePicker } from "@/components/reports/range-picker";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  InvoiceStatus,
  ProjectStatus,
} from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Reports" };

const CATEGORY_LABELS: Record<string, string> = {
  SOFTWARE: "Software",
  HARDWARE: "Hardware",
  SERVICES: "Services",
  TRAVEL: "Travel",
  MEALS: "Meals",
  OFFICE: "Office",
  OTHER: "Other",
};

const PROJECT_TONES: Record<string, "outline" | "primary" | "warning" | "success" | "destructive"> =
  {
    PLANNING: "outline",
    ACTIVE: "primary",
    ON_HOLD: "warning",
    COMPLETED: "success",
    CANCELLED: "destructive",
  };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await guardPermission("reports.view");
  const { range } = await searchParams;
  const now = new Date();
  const since = sinceForRange(range, now);

  const paymentWhere = since ? { paidAt: { gte: since } } : {};
  const invoiceWhere = { deletedAt: null, ...(since ? { createdAt: { gte: since } } : {}) };
  const expenseWhere = { deletedAt: null, ...(since ? { incurredAt: { gte: since } } : {}) };
  const projectInvoiceWhere = {
    deletedAt: null,
    status: { not: InvoiceStatus.VOID },
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const [payments, invoices, expenses, projects, activeClients, activeProjects, openTasks, openLeads] =
    await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        select: {
          amountCents: true,
          paidAt: true,
          client: { select: { id: true, name: true } },
          invoice: {
            select: {
              status: true,
              client: { select: { id: true, name: true } },
            },
          },
          project: { select: { client: { select: { id: true, name: true } } } },
        },
        orderBy: { paidAt: "asc" },
      }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: { status: true, totalCents: true },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        select: { amountCents: true, category: true },
      }),
      prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          invoices: {
            where: projectInvoiceWhere,
            select: {
              totalCents: true,
              payments: { where: paymentWhere, select: { amountCents: true } },
            },
          },
          expenses: { where: expenseWhere, select: { amountCents: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.client.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.project.count({ where: { deletedAt: null, status: ProjectStatus.ACTIVE } }),
      prisma.task.count({
        where: { deletedAt: null, status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] } },
      }),
      prisma.lead.count({ where: { deletedAt: null, status: { notIn: ["WON", "LOST"] } } }),
    ]);

  const revenue = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const invoiced = invoices.reduce(
    (sum, i) => (i.status === InvoiceStatus.VOID ? sum : sum + i.totalCents),
    0,
  );
  const outstanding = invoices.reduce(
    (sum, i) => (i.status === InvoiceStatus.SENT ? sum + i.totalCents : sum),
    0,
  );
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const netProfit = revenue - expenseTotal;

  const earliestPayment = payments.length > 0 ? payments[0].paidAt : null;
  const trendStart =
    since ?? earliestPayment ?? new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const buckets = buildMonthSeries(trendStart, now);
  const trend = sumByMonth(
    payments.map((p) => ({ date: p.paidAt, amount: p.amountCents })),
    buckets,
  );
  const trendData: BarDatum[] = buckets.map((bucket, index) => ({
    label: bucket.label,
    value: trend[index],
    display: formatCurrency(trend[index] / 100),
  }));

  const categoryTotals = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const expense of expenses) {
    categoryTotals.set(expense.category, (categoryTotals.get(expense.category) ?? 0) + expense.amountCents);
    categoryCounts.set(expense.category, (categoryCounts.get(expense.category) ?? 0) + 1);
  }
  const categoryData: BarDatum[] = Array.from(categoryTotals.entries())
    .map(([category, value]) => ({
      label: CATEGORY_LABELS[category] ?? category,
      value,
      display: formatCurrency(value / 100),
      sublabel: `${categoryCounts.get(category) ?? 0} transaction(s)`,
    }))
    .sort((a, b) => b.value - a.value);

  const clientRevenue = new Map<string, { name: string; value: number }>();
  for (const payment of payments) {
    const linkedClient = payment.client ?? payment.invoice?.client ?? payment.project?.client ?? null;
    const key = linkedClient?.id ?? "unassigned";
    const current = clientRevenue.get(key);
    if (current) {
      current.value += payment.amountCents;
    } else {
      clientRevenue.set(key, { name: linkedClient?.name ?? "Unassigned", value: payment.amountCents });
    }
  }
  const clientRows = Array.from(clientRevenue.entries())
    .map(([, { name, value }]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const clientData: BarDatum[] = clientRows.slice(0, 6).map(({ name, value }) => ({
    label: name,
    value,
    display: formatCurrency(value / 100),
  }));

  const projectRows = projects
    .map((project) => {
      const projectInvoiced = project.invoices.reduce((sum, i) => sum + i.totalCents, 0);
      const projectPaid = project.invoices.reduce(
        (sum, i) => sum + i.payments.reduce((s, p) => s + p.amountCents, 0),
        0,
      );
      const projectExpenses = project.expenses.reduce((sum, e) => sum + e.amountCents, 0);
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        budget: project.budget,
        invoiced: projectInvoiced,
        paid: projectPaid,
        expenses: projectExpenses,
        margin: projectInvoiced - projectExpenses,
      };
    })
    .sort((a, b) => b.invoiced - a.invoiced);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeading
          title="Reports & Analytics"
          description={
            range === "all"
              ? "Financial and operational performance across all time."
              : `Financial and operational performance for the selected period.`
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
        <MetricCard label="Invoiced" value={formatCurrency(invoiced / 100)} icon={FileText} />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(outstanding / 100)}
          icon={Receipt}
          tone="negative"
        />
        <MetricCard
          label="Expenses"
          value={formatCurrency(expenseTotal / 100)}
          icon={Wallet}
        />
        <MetricCard
          label="Net profit"
          value={formatCurrency(netProfit / 100)}
          icon={Activity}
          tone={netProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active clients" value={String(activeClients)} icon={UserRound} />
        <MetricCard label="Active projects" value={String(activeProjects)} icon={FolderKanban} />
        <MetricCard label="Open tasks" value={String(openTasks)} icon={Target} />
        <MetricCard label="Open leads" value={String(openLeads)} icon={Target} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue trend
            </CardTitle>
            <CardDescription>Payments collected, by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <VerticalBars data={trendData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue by client
              </CardTitle>
              <CardDescription>Payments collected, by client.</CardDescription>
            </div>
            <CsvExportButton
              filename="revenue-by-client.csv"
              columns={["Client", "Revenue"]}
              rows={clientRows.map((row) => [row.name, (row.value / 100).toFixed(2)])}
            />
          </CardHeader>
          <CardContent>
            <HorizontalBars data={clientData} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expenses by category
            </CardTitle>
            <CardDescription>Spending breakdown for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={categoryData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project profitability
              </CardTitle>
              <CardDescription>Invoiced vs. expenses, per project.</CardDescription>
            </div>
            <CsvExportButton
              filename="project-profitability.csv"
              columns={["Project", "Status", "Budget", "Invoiced", "Paid", "Expenses", "Margin"]}
              rows={projectRows.map((row) => [
                row.name,
                row.status,
                row.budget != null ? (row.budget / 100).toFixed(2) : "",
                (row.invoiced / 100).toFixed(2),
                (row.paid / 100).toFixed(2),
                (row.expenses / 100).toFixed(2),
                (row.margin / 100).toFixed(2),
              ])}
            />
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                {
                  key: "project",
                  header: "Project",
                  cell: (row) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{row.name}</span>
                      <Badge tone={PROJECT_TONES[row.status] ?? "outline"}>{row.status}</Badge>
                    </div>
                  ),
                },
                {
                  key: "budget",
                  header: "Budget",
                  cell: (row) => (
                    <span className="text-muted-foreground">
                      {row.budget != null ? formatCurrency(row.budget / 100) : "—"}
                    </span>
                  ),
                },
                {
                  key: "invoiced",
                  header: "Invoiced",
                  cell: (row) => (
                    <span className="text-foreground">{formatCurrency(row.invoiced / 100)}</span>
                  ),
                },
                {
                  key: "paid",
                  header: "Paid",
                  cell: (row) => (
                    <span className="text-muted-foreground">{formatCurrency(row.paid / 100)}</span>
                  ),
                },
                {
                  key: "expenses",
                  header: "Expenses",
                  cell: (row) => (
                    <span className="text-muted-foreground">
                      {formatCurrency(row.expenses / 100)}
                    </span>
                  ),
                },
                {
                  key: "margin",
                  header: "Margin",
                  cell: (row) => (
                    <span
                      className={
                        row.margin >= 0
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "font-medium text-red-600 dark:text-red-400"
                      }
                    >
                      {formatCurrency(row.margin / 100)}
                    </span>
                  ),
                },
              ]}
              data={projectRows}
              keyExtractor={(row) => row.id}
              emptyTitle="No project financials yet"
              emptyDescription="Invoice or log expenses against projects to see profitability here."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
