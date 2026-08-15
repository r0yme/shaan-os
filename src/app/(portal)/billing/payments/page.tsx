import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { PaymentsView, type SerializedPaymentRow } from "@/components/billing/payments-view";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const user = await guardPermission("payments.view");

  const [payments, invoices, projects, tasks] = await Promise.all([
    prisma.payment.findMany({
      include: {
        client: { select: { id: true, name: true } },
        invoice: { select: { id: true, number: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null },
      select: { id: true, number: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const serialized: SerializedPaymentRow[] = payments.map((payment) => ({
    id: payment.id,
    amountCents: payment.amountCents,
    method: payment.method,
    paidAt: payment.paidAt.toISOString(),
    reference: payment.reference,
    notes: payment.notes,
    proofFileName: payment.proofFileName,
    clientName: payment.client?.name ?? null,
    invoiceNumber: payment.invoice?.number ?? null,
    projectName: payment.project?.name ?? null,
    taskTitle: payment.task?.title ?? null,
    recordedByName: payment.recordedBy?.name ?? null,
  }));

  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <>
      <PageHeading
        title="Payments"
        description="Every payment received across invoices, projects and tasks."
      />
      <BillingTabs active="payments" />
      <PaymentsView
        payments={serialized}
        totalCents={totalCents}
        canRecord={user.permissions.has("payments.create")}
        invoiceOptions={invoices.map((i) => ({ value: i.id, label: i.number }))}
        projectOptions={projects.map((p) => ({ value: p.id, label: p.name }))}
        taskOptions={tasks.map((t) => ({ value: t.id, label: t.title }))}
      />
    </>
  );
}
