"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import {
  cancelApprovalSchema,
  decideApprovalSchema,
  parseWithZod,
  requestApprovalSchema,
} from "@/lib/validation";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { AuditAction, ApprovalStatus, ApprovalType, NotificationKind } from "@/generated/prisma/enums";
import { notify, notifyMany, userIdsWithPermission } from "@/lib/notifications";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const ENTITY_NAMES: Record<ApprovalType, string> = {
  INVOICE: "invoice",
  EXPENSE: "expense",
  MILESTONE: "milestone",
};

async function resolveEntity(
  type: ApprovalType,
  entityId: string,
): Promise<{ label: string; detail?: string }> {
  switch (type) {
    case ApprovalType.INVOICE: {
      const invoice = await prisma.invoice.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { number: true },
      });
      if (!invoice) throw new NotFoundError("Invoice not found.");
      return { label: `Invoice ${invoice.number}`, detail: invoice.number };
    }
    case ApprovalType.EXPENSE: {
      const expense = await prisma.expense.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { description: true, merchant: true },
      });
      if (!expense) throw new NotFoundError("Expense not found.");
      return {
        label: expense.description ?? expense.merchant ?? "Expense",
        detail: expense.merchant ?? undefined,
      };
    }
    case ApprovalType.MILESTONE: {
      const milestone = await prisma.milestone.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      if (!milestone) throw new NotFoundError("Milestone not found.");
      return { label: milestone.title, detail: "Milestone" };
    }
  }
}

export async function requestApprovalAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("approvals.manage");
    const data = parseWithZod(requestApprovalSchema, input);

    const entity = await resolveEntity(data.type, data.entityId);

    const existing = await prisma.approval.findFirst({
      where: { type: data.type, entityId: data.entityId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(
        `An approval request for this ${ENTITY_NAMES[data.type]} is already pending.`,
      );
    }

    const approval = await prisma.approval.create({
      data: {
        type: data.type,
        entityId: data.entityId,
        requestorId: user.id,
        comment: data.comment,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: AuditAction.CREATE,
      entity: "Approval",
      entityId: approval.id,
      summary: `Approval requested for ${entity.label}${data.comment ? ` — ${data.comment}` : ""}`,
    });

    const reviewers = await userIdsWithPermission("approvals.manage", user.id);
    await notifyMany(
      reviewers.map((reviewerId) => ({
        userId: reviewerId,
        kind: NotificationKind.APPROVAL,
        title: "Approval requested",
        body: entity.label,
        link: "/approvals",
        entityType: "Approval",
        entityId: approval.id,
      })),
    );

    revalidatePath("/approvals");
    revalidatePath("/billing/expenses");
    return { ok: true, id: approval.id };
  } catch (error) {
    return errorResult(error, "requestApproval");
  }
}

export async function decideApprovalAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("approvals.manage");
    const data = parseWithZod(decideApprovalSchema, input);

    const approval = await prisma.approval.findFirst({
      where: { id: data.id, deletedAt: null },
      select: { type: true, entityId: true, requestorId: true },
    });
    if (!approval) throw new NotFoundError("Approval request not found.");

    const result = await prisma.approval.updateMany({
      where: { id: data.id, status: ApprovalStatus.PENDING, deletedAt: null },
      data: {
        status: data.decision,
        decidedById: user.id,
        decidedAt: new Date(),
        comment: data.comment,
      },
    });
    if (result.count === 0) {
      throw new ConflictError("This approval request is no longer pending.");
    }

    const entity = await resolveEntity(approval.type, approval.entityId);
    await recordAudit({
      actorId: user.id,
      action: data.decision === "APPROVED" ? AuditAction.APPROVE : AuditAction.REJECT,
      entity: "Approval",
      entityId: data.id,
      summary: `Approval ${data.decision.toLowerCase()} for ${entity.label}`,
    });

    if (approval.requestorId) {
      await notify({
        userId: approval.requestorId,
        kind: NotificationKind.APPROVAL,
        title: data.decision === "APPROVED" ? "Approval granted" : "Approval rejected",
        body: entity.label,
        link: "/approvals",
        entityType: "Approval",
        entityId: data.id,
      });
    }

    revalidatePath("/approvals");
    revalidatePath("/billing/expenses");
    return { ok: true, id: data.id };
  } catch (error) {
    return errorResult(error, "decideApproval");
  }
}

export async function cancelApprovalAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("approvals.manage");
    const data = parseWithZod(cancelApprovalSchema, input);

    const approval = await prisma.approval.findFirst({
      where: { id: data.id, deletedAt: null },
      select: { type: true, entityId: true },
    });
    if (!approval) throw new NotFoundError("Approval request not found.");

    const result = await prisma.approval.updateMany({
      where: { id: data.id, status: ApprovalStatus.PENDING, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) {
      throw new ConflictError("Only pending approval requests can be cancelled.");
    }

    const entity = await resolveEntity(approval.type, approval.entityId);
    await recordAudit({
      actorId: user.id,
      action: AuditAction.DELETE,
      entity: "Approval",
      entityId: data.id,
      summary: `Approval request cancelled for ${entity.label}`,
    });
    revalidatePath("/approvals");
    revalidatePath("/billing/expenses");
    return { ok: true, id: data.id };
  } catch (error) {
    return errorResult(error, "cancelApproval");
  }
}
