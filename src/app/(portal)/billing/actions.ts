"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, invoiceSchema, paymentSchema } from "@/lib/validation";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function computeTotals(
  items: Array<{ quantity: number; unitPriceCents: number }>,
  taxRateBps: number,
) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

async function assertRefs(clientId: string | null, projectId: string | null) {
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
    if (!client) throw new NotFoundError("The selected client no longer exists.");
  }
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundError("The selected project no longer exists.");
  }
}

async function nextInvoiceNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.businessProfile.update({
      where: { id: "default" },
      data: { invoiceNextNumber: { increment: 1 } },
    });
    const used = updated.invoiceNextNumber - 1;
    return `${updated.invoicePrefix ?? "INV"}-${String(used).padStart(4, "0")}`;
  });
}

function revalidateInvoicePaths() {
  revalidatePath("/billing");
  revalidatePath("/c/invoices");
}

export async function createInvoiceAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("invoices.create");
    const data = parseWithZod(invoiceSchema, input);
    await assertRefs(data.clientId, data.projectId);

    const totals = computeTotals(data.items, data.taxRateBps);
    const number = await nextInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: data.clientId,
        projectId: data.projectId,
        status: data.status,
        issueDate: data.issueDate ?? new Date(),
        dueDate: data.dueDate,
        taxRateBps: data.taxRateBps,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        notes: data.notes,
        createdById: user.id,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            amountCents: item.quantity * item.unitPriceCents,
          })),
        },
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Invoice",
      entityId: invoice.id,
      summary: `Invoice created: ${invoice.number}`,
    });
    revalidateInvoicePaths();
    return { ok: true, id: invoice.id };
  } catch (error) {
    return errorResult(error, "createInvoice");
  }
}

export async function updateInvoiceAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("invoices.update");
    const data = parseWithZod(invoiceSchema, input);
    await assertRefs(data.clientId, data.projectId);

    const existing = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, number: true, status: true },
    });
    if (!existing) throw new NotFoundError("Invoice not found.");
    if (existing.status !== "DRAFT") {
      throw new ConflictError("Only draft invoices can be edited.");
    }

    const totals = computeTotals(data.items, data.taxRateBps);

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      return tx.invoice.update({
        where: { id },
        data: {
          clientId: data.clientId,
          projectId: data.projectId,
          status: data.status,
          issueDate: data.issueDate ?? new Date(),
          dueDate: data.dueDate,
          taxRateBps: data.taxRateBps,
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              amountCents: item.quantity * item.unitPriceCents,
            })),
          },
        },
      });
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Invoice",
      entityId: invoice.id,
      summary: `Invoice updated: ${existing.number}`,
    });
    revalidateInvoicePaths();
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "updateInvoice");
  }
}

export async function sendInvoiceAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("invoices.send");

    const existing = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, number: true, status: true },
    });
    if (!existing) throw new NotFoundError("Invoice not found.");
    if (existing.status !== "DRAFT") {
      throw new ConflictError("Only draft invoices can be sent.");
    }

    await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });

    await recordAudit({
      actorId: user.id,
      action: "STATUS_CHANGE",
      entity: "Invoice",
      entityId: id,
      summary: `Invoice sent: ${existing.number}`,
    });
    revalidateInvoicePaths();
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "sendInvoice");
  }
}

export async function voidInvoiceAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("invoices.void");

    const existing = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, number: true, status: true },
    });
    if (!existing) throw new NotFoundError("Invoice not found.");
    if (existing.status === "PAID" || existing.status === "VOID") {
      throw new ConflictError("Paid or voided invoices cannot be voided.");
    }

    await prisma.invoice.update({ where: { id }, data: { status: "VOID" } });

    await recordAudit({
      actorId: user.id,
      action: "STATUS_CHANGE",
      entity: "Invoice",
      entityId: id,
      summary: `Invoice voided: ${existing.number}`,
    });
    revalidateInvoicePaths();
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "voidInvoice");
  }
}

export async function recordPaymentAction(
  invoiceId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("payments.create");
    const data = parseWithZod(paymentSchema, input);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: { id: true, number: true, status: true, totalCents: true },
    });
    if (!invoice) throw new NotFoundError("Invoice not found.");
    if (invoice.status === "VOID") throw new ConflictError("Voided invoices cannot accept payments.");
    if (invoice.status === "PAID") throw new ConflictError("This invoice is already paid in full.");

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amountCents: data.amountCents,
        method: data.method,
        paidAt: data.paidAt ?? new Date(),
        reference: data.reference,
        notes: data.notes,
        recordedById: user.id,
      },
    });

    const paidSum = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amountCents: true },
    });
    const totalPaid = paidSum._sum.amountCents ?? 0;
    if (totalPaid >= invoice.totalCents) {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
    }

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Payment",
      entityId: payment.id,
      summary: `Payment of $${(data.amountCents / 100).toFixed(2)} recorded on ${invoice.number}`,
      metadata: { invoiceId },
    });
    revalidateInvoicePaths();
    return { ok: true, id: payment.id };
  } catch (error) {
    return errorResult(error, "recordPayment");
  }
}
