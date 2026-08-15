"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, clientPaymentSchema } from "@/lib/validation";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { removeStoredFile, saveUploadBytes, sanitizeFileName } from "@/lib/storage";
import { notifyMany, userIdsWithPermission } from "@/lib/notifications";
import { NotificationKind } from "@/generated/prisma/enums";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function assertClientScope(portalUserId: string, data: {
  invoiceId: string | null;
  projectId: string | null;
  taskId: string | null;
}) {
  const profile = await prisma.client.findFirst({
    where: { portalUserId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!profile) throw new ForbiddenError("You can only make payments from your own account.");

  if (data.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, clientId: profile.id, deletedAt: null },
      select: { id: true, number: true, status: true, totalCents: true },
    });
    if (!invoice) throw new ForbiddenError("The selected invoice is not yours.");
    return { profile, invoice };
  }

  if (data.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, clientId: profile.id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!project) throw new ForbiddenError("The selected project is not yours.");
    return { profile, invoice: null };
  }

  if (data.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, deletedAt: null },
      include: { project: { select: { clientId: true } } },
    });
    if (!task) throw new NotFoundError("The selected task no longer exists.");
    if (!task.project || task.project.clientId !== profile.id) {
      throw new ForbiddenError("The selected task is not from one of your projects.");
    }
    return { profile, invoice: null };
  }

  throw new ValidationError("Link the payment to an invoice, project or task.");
}

export async function recordClientPaymentAction(formData: FormData): Promise<ActionResult> {
  let storageKey: string | null = null;
  try {
    const user = await requirePermission("payments.create");

    const proofEntry = formData.get("proof");
    if (proofEntry !== null && !(proofEntry instanceof File)) {
      throw new ValidationError("The uploaded proof is invalid.");
    }
    const file = proofEntry instanceof File ? proofEntry : null;
    if (file && file.size === 0) throw new ValidationError("The uploaded proof is empty.");

    const data = parseWithZod(clientPaymentSchema, {
      amountCents: String(formData.get("amountCents") ?? ""),
      method: formData.get("method") || "BANK_TRANSFER",
      paidAt: formData.get("paidAt"),
      reference: formData.get("reference"),
      notes: formData.get("notes"),
      invoiceId: formData.get("invoiceId"),
      projectId: formData.get("projectId"),
      taskId: formData.get("taskId"),
      proofFileName: file ? sanitizeFileName(file.name) : null,
      proofMimeType: file ? file.type || null : null,
      proofSizeBytes: file ? file.size : null,
    });

    const { profile, invoice } = await assertClientScope(user.id, data);

    if (invoice && invoice.status === "PAID") {
      throw new AppError(400, "This invoice is already paid in full.");
    }

    if (file) {
      storageKey = await saveUploadBytes(new Uint8Array(await file.arrayBuffer()));
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        projectId: data.projectId,
        taskId: data.taskId,
        clientId: profile.id,
        amountCents: data.amountCents,
        method: data.method,
        paidAt: data.paidAt ?? new Date(),
        reference: data.reference,
        notes: data.notes,
        proofStorageKey: storageKey,
        proofFileName: data.proofFileName,
        proofMimeType: data.proofMimeType,
        proofSizeBytes: data.proofSizeBytes,
        recordedById: user.id,
      },
    });

    if (data.invoiceId && invoice) {
      const paidSum = await prisma.payment.aggregate({
        where: { invoiceId: data.invoiceId },
        _sum: { amountCents: true },
      });
      if ((paidSum._sum.amountCents ?? 0) >= invoice.totalCents) {
        await prisma.invoice.update({
          where: { id: data.invoiceId },
          data: { status: "PAID" },
        });
      }
    }

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Payment",
      entityId: payment.id,
      summary: `Payment of ${formatCurrency(data.amountCents / 100)} received from ${profile.name}`,
      metadata: {
        invoiceId: data.invoiceId,
        projectId: data.projectId,
        taskId: data.taskId,
      },
    });

    const teamMemberIds = await userIdsWithPermission("payments.view", user.id);
    if (teamMemberIds.length > 0) {
      const body = `${formatCurrency(data.amountCents / 100)}${data.reference ? ` · ${data.reference}` : ""}`;
      await notifyMany(
        teamMemberIds.map((memberId) => ({
          userId: memberId,
          kind: NotificationKind.PAYMENT,
          title: `Payment received from ${profile.name}`,
          body,
          link: "/billing",
          entityType: "Payment",
          entityId: payment.id,
        })),
      );
    }

    revalidatePath("/c/payments");
    revalidatePath("/c/invoices");
    revalidatePath("/billing");
    return { ok: true, id: payment.id };
  } catch (error) {
    if (storageKey) {
      await removeStoredFile(storageKey);
    }
    return errorResult(error, "recordClientPayment");
  }
}
