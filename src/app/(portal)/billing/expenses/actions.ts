"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, expenseSchema } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function assertRefs(projectId: string | null, clientId: string | null) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("The selected project no longer exists.");
  }
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundError("The selected client no longer exists.");
  }
}

export async function createExpenseAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("expenses.create");
    const data = parseWithZod(expenseSchema, input);
    await assertRefs(data.projectId, data.clientId);

    const expense = await prisma.expense.create({
      data: {
        amountCents: data.amountCents,
        category: data.category,
        merchant: data.merchant,
        description: data.description,
        incurredAt: data.incurredAt ?? new Date(),
        projectId: data.projectId,
        clientId: data.clientId,
        recordedById: user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Expense",
      entityId: expense.id,
      summary: `Expense recorded: $${(expense.amountCents / 100).toFixed(2)} (${expense.category})`,
    });
    revalidatePath("/billing/expenses");
    return { ok: true, id: expense.id };
  } catch (error) {
    return errorResult(error, "createExpense");
  }
}

export async function updateExpenseAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("expenses.update");
    const data = parseWithZod(expenseSchema, input);
    await assertRefs(data.projectId, data.clientId);

    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Expense not found.");

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        amountCents: data.amountCents,
        category: data.category,
        merchant: data.merchant,
        description: data.description,
        incurredAt: data.incurredAt ?? new Date(),
        projectId: data.projectId,
        clientId: data.clientId,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Expense",
      entityId: expense.id,
      summary: `Expense updated: $${(expense.amountCents / 100).toFixed(2)} (${expense.category})`,
    });
    revalidatePath("/billing/expenses");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "updateExpense");
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("expenses.delete");

    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, amountCents: true, category: true },
    });
    if (!existing) throw new NotFoundError("Expense not found.");

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "Expense",
      entityId: id,
      summary: `Expense deleted: $${(existing.amountCents / 100).toFixed(2)} (${existing.category})`,
    });
    revalidatePath("/billing/expenses");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteExpense");
  }
}
