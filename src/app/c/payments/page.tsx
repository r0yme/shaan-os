import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import {
  ClientPaymentsView,
  type ClientSerializedPayment,
} from "@/components/payments/client-payments-view";
import { InvoiceStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Payments" };

export default async function ClientPaymentsPage() {
  const user = await requireUser();

  const clientProfile = await prisma.client.findFirst({
    where: { portalUserId: user.id, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!clientProfile) notFound();

  const [payments, invoices, projects, tasks] = await Promise.all([
    prisma.payment.findMany({
      where: {
        OR: [
          { clientId: clientProfile.id },
          { invoice: { clientId: clientProfile.id } },
          { project: { clientId: clientProfile.id } },
          { task: { project: { clientId: clientProfile.id } } },
        ],
      },
      include: {
        invoice: { select: { id: true, number: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        clientId: clientProfile.id,
        deletedAt: null,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PAID] },
      },
      select: { id: true, number: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { clientId: clientProfile.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        project: { clientId: clientProfile.id },
        deletedAt: null,
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const serialized: ClientSerializedPayment[] = payments.map((payment) => ({
    id: payment.id,
    amountCents: payment.amountCents,
    method: payment.method,
    paidAt: payment.paidAt.toISOString(),
    reference: payment.reference,
    notes: payment.notes,
    proofFileName: payment.proofFileName,
    invoiceNumber: payment.invoice?.number ?? null,
    projectName: payment.project?.name ?? null,
    taskTitle: payment.task?.title ?? null,
  }));

  const totalPaidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <>
      <PageHeading
        title="Payments"
        description="Record payments and upload proof for invoices, projects or tasks."
      />
      <ClientPaymentsView
        payments={serialized}
        totalPaidCents={totalPaidCents}
        clientName={clientProfile.name}
        invoiceOptions={invoices.map((invoice) => ({
          value: invoice.id,
          label: invoice.number,
        }))}
        projectOptions={projects.map((project) => ({ value: project.id, label: project.name }))}
        taskOptions={tasks.map((task) => ({ value: task.id, label: task.title }))}
      />
    </>
  );
}
