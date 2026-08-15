import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { BillingTabs } from "@/components/billing/billing-tabs";
import {
  BillingManager,
  type SerializedInvoice,
  type SerializedInvoiceItem,
} from "@/components/billing/billing-manager";
import type { SerializedPayment } from "@/components/billing/payments-modal";
import { InvoiceStatus, PaymentMethod } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Billing" };

const STATUSES = new Set<string>(["DRAFT", "SENT", "PAID", "VOID"]);

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await guardPermission("invoices.view");
  const { status } = await searchParams;

  const [invoices, clients, projects] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        deletedAt: null,
        ...(status && STATUSES.has(status) ? { status: status as InvoiceStatus } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        items: true,
        payments: {
          include: { recordedBy: { select: { name: true } } },
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
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

  const serializeItems = (items: {
    description: string;
    quantity: number;
    unitPriceCents: number;
    amountCents: number;
  }[]): SerializedInvoiceItem[] =>
    items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      amountCents: item.amountCents,
    }));

  const serializePayments = (payments: {
    id: string;
    amountCents: number;
    method: PaymentMethod;
    paidAt: Date;
    reference: string | null;
    notes: string | null;
    recordedBy: { name: string | null } | null;
  }[]): SerializedPayment[] =>
    payments.map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      method: payment.method,
      paidAt: payment.paidAt.toISOString(),
      reference: payment.reference,
      notes: payment.notes,
      recordedByName: payment.recordedBy?.name ?? null,
    }));

  const serialized: SerializedInvoice[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    clientId: invoice.clientId,
    clientName: invoice.client?.name ?? null,
    projectId: invoice.projectId,
    projectName: invoice.project?.name ?? null,
    status: invoice.status,
    issueDate: invoice.issueDate ? invoice.issueDate.toISOString() : null,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    taxRateBps: invoice.taxRateBps,
    subtotalCents: invoice.subtotalCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    notes: invoice.notes,
    createdAt: invoice.createdAt.toISOString(),
    items: serializeItems(invoice.items),
    payments: serializePayments(invoice.payments),
  }));

  return (
    <>
      <PageHeading
        title="Billing"
        description="Invoices, payments and outstanding balances."
      />
      <BillingTabs active="invoices" />
      <BillingManager
        invoices={serialized}
        statusFilter={status && STATUSES.has(status) ? status : ""}
        clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
        projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        canCreate={user.permissions.has("invoices.create")}
        canEdit={user.permissions.has("invoices.update")}
        canSend={user.permissions.has("invoices.send")}
        canVoid={user.permissions.has("invoices.void")}
        canRecordPayment={user.permissions.has("payments.create")}
      />
    </>
  );
}
