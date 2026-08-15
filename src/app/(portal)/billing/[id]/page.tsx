import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, FolderKanban, StickyNote } from "lucide-react";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { InvoiceStatusBadge, PaymentMethodBadge } from "@/components/billing/status-badges";
import { InvoiceDetailActions } from "@/components/billing/invoice-detail-actions";
import type { SerializedPayment } from "@/components/billing/payments-modal";
import type { InvoiceFormValue } from "@/components/billing/invoice-form-modal";

export const metadata: Metadata = { title: "Invoice" };

function dateOnly(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await guardPermission("invoices.view");
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      items: true,
      payments: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!invoice) notFound();

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const paidCents = invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const remainingCents = Math.max(invoice.totalCents - paidCents, 0);

  const formValue: InvoiceFormValue = {
    id: invoice.id,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    status: invoice.status === "DRAFT" ? "DRAFT" : "SENT",
    issueDate: invoice.issueDate ? invoice.issueDate.toISOString().slice(0, 10) : null,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
    taxPercent: String(invoice.taxRateBps / 100),
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unitPriceDollars: String(item.unitPriceCents / 100),
    })),
  };

  const serializedPayments: SerializedPayment[] = invoice.payments.map((payment) => ({
    id: payment.id,
    amountCents: payment.amountCents,
    method: payment.method,
    paidAt: payment.paidAt.toISOString(),
    reference: payment.reference,
    notes: payment.notes,
    recordedByName: payment.recordedBy?.name ?? null,
  }));

  return (
    <>
      <Link
        href="/billing"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to billing
      </Link>

      <PageHeading
        title={invoice.number}
        description={<InvoiceStatusBadge status={invoice.status} />}
        actions={
          <InvoiceDetailActions
            invoice={formValue}
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            status={invoice.status}
            remainingCents={remainingCents}
            payments={serializedPayments}
            clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
            projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
            canEdit={user.permissions.has("invoices.update")}
            canSend={user.permissions.has("invoices.send")}
            canVoid={user.permissions.has("invoices.void")}
            canRecordPayment={user.permissions.has("payments.create")}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: "description",
                    header: "Description",
                    cell: (item) => (
                      <span className="font-medium text-foreground">{item.description}</span>
                    ),
                  },
                  {
                    key: "qty",
                    header: "Qty",
                    className: "text-right",
                    cell: (item) => <span className="text-muted-foreground">{item.quantity}</span>,
                  },
                  {
                    key: "unit",
                    header: "Unit price",
                    className: "text-right",
                    cell: (item) => (
                      <span className="text-muted-foreground">
                        {formatCurrency(item.unitPriceCents / 100)}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    className: "text-right",
                    cell: (item) => (
                      <span className="font-medium text-foreground">
                        {formatCurrency(item.amountCents / 100)}
                      </span>
                    ),
                  },
                ]}
                data={invoice.items}
                keyExtractor={(item) => item.id}
                emptyTitle="No line items"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable<SerializedPayment>
                columns={[
                  {
                    key: "amount",
                    header: "Amount",
                    cell: (payment) => (
                      <span className="font-medium text-foreground">
                        {formatCurrency(payment.amountCents / 100)}
                      </span>
                    ),
                  },
                  {
                    key: "method",
                    header: "Method",
                    cell: (payment) => <PaymentMethodBadge method={payment.method} />,
                  },
                  {
                    key: "paid",
                    header: "Paid on",
                    cell: (payment) => (
                      <span className="text-muted-foreground">
                        {dateOnly(new Date(payment.paidAt))}
                      </span>
                    ),
                  },
                  {
                    key: "reference",
                    header: "Reference",
                    cell: (payment) => (
                      <span className="text-muted-foreground">{payment.reference ?? "—"}</span>
                    ),
                  },
                  {
                    key: "by",
                    header: "Recorded by",
                    cell: (payment) => (
                      <span className="text-muted-foreground">
                        {payment.recordedByName ?? "—"}
                      </span>
                    ),
                  },
                ]}
                data={serializedPayments}
                keyExtractor={(payment) => payment.id}
                emptyTitle="No payments yet"
                emptyDescription="Record a payment against this invoice to get started."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.client ? (
                <Link
                  href={`/clients/${invoice.client.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <Avatar name={invoice.client.name} className="h-8 w-8 text-xs" />
                  <p className="text-sm font-medium text-foreground">{invoice.client.name}</p>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No client on this invoice</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Project</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.project ? (
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{invoice.project.name}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not linked to a project</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Issued</p>
                  <p className="text-sm font-medium text-foreground">{dateOnly(invoice.issueDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Due</p>
                  <p className="text-sm font-medium text-foreground">{dateOnly(invoice.dueDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(invoice.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotalCents / 100)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(invoice.taxCents / 100)}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(invoice.totalCents / 100)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Paid</span>
                <span className="text-success">{formatCurrency(paidCents / 100)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
                <span>Balance</span>
                <span>{formatCurrency(remainingCents / 100)}</span>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="flex items-start gap-2 whitespace-pre-wrap text-sm text-foreground">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
