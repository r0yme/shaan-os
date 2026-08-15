import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { InvoiceStatusBadge } from "@/components/billing/status-badges";
import { InvoiceStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Invoices" };

function dateOnly(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function ClientInvoicesPage() {
  const user = await requireUser();

  const clientProfile = await prisma.client.findFirst({
    where: { portalUserId: user.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!clientProfile) notFound();

  const invoices = await prisma.invoice.findMany({
    where: {
      clientId: clientProfile.id,
      deletedAt: null,
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.PAID] },
    },
    orderBy: { createdAt: "desc" },
  });

  const paidCents = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const outstandingCents = invoices
    .filter((invoice) => invoice.status === "SENT")
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);

  return (
    <>
      <PageHeading title="Invoices" description="Your invoices with Shaan OS." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-warning">
              {formatCurrency(outstandingCents / 100)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">
              {formatCurrency(paidCents / 100)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <DataTable
          columns={[
            {
              key: "number",
              header: "Invoice",
              cell: (invoice) => (
                <span className="font-medium text-foreground">{invoice.number}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
            },
            {
              key: "issued",
              header: "Issued",
              cell: (invoice) => (
                <span className="text-muted-foreground">{dateOnly(invoice.issueDate)}</span>
              ),
            },
            {
              key: "due",
              header: "Due",
              cell: (invoice) => (
                <span className="text-muted-foreground">{dateOnly(invoice.dueDate)}</span>
              ),
            },
            {
              key: "total",
              header: "Amount",
              className: "text-right",
              cell: (invoice) => (
                <span className="font-medium text-foreground">
                  {formatCurrency(invoice.totalCents / 100)}
                </span>
              ),
            },
          ]}
          data={invoices}
          keyExtractor={(invoice) => invoice.id}
          emptyIcon={ReceiptText}
          emptyTitle="No invoices yet"
          emptyDescription="Your invoices will appear here once they're sent."
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Questions about an invoice? Reach out via{" "}
        <Link href="/c/messages" className="font-medium text-primary hover:underline">
          Messages
        </Link>
        .
      </p>
    </>
  );
}
