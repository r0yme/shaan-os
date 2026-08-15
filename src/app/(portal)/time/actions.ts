"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, timeEntrySchema } from "@/lib/validation";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { formatMinutes } from "@/lib/time";
import type { CurrentUser } from "@/lib/session";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function assertTask(taskId: string | null) {
  if (!taskId) return;
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true },
  });
  if (!task) throw new NotFoundError("The selected task no longer exists.");
}

function canManageEntry(user: CurrentUser, ownerId: string): boolean {
  return user.id === ownerId || user.permissions.has("employees.view");
}

export async function logTimeAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("time.create");
    const data = parseWithZod(timeEntrySchema, input);
    await assertTask(data.taskId);

    const entry = await prisma.timeEntry.create({
      data: {
        userId: user.id,
        taskId: data.taskId,
        minutes: data.minutes,
        date: data.date,
        note: data.note,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "TimeEntry",
      entityId: entry.id,
      summary: `Time logged: ${formatMinutes(entry.minutes)} on ${entry.date.toISOString().slice(0, 10)}`,
    });
    revalidatePath("/time");
    return { ok: true, id: entry.id };
  } catch (error) {
    return errorResult(error, "logTime");
  }
}

export async function updateTimeAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("time.update");
    const data = parseWithZod(timeEntrySchema, input);
    await assertTask(data.taskId);

    const existing = await prisma.timeEntry.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundError("Time entry not found.");
    if (!canManageEntry(user, existing.userId)) {
      throw new ForbiddenError("You can only edit your own time entries.");
    }

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: { taskId: data.taskId, minutes: data.minutes, date: data.date, note: data.note },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "TimeEntry",
      entityId: entry.id,
      summary: `Time entry updated: ${formatMinutes(entry.minutes)} on ${entry.date.toISOString().slice(0, 10)}`,
    });
    revalidatePath("/time");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "updateTime");
  }
}

export async function deleteTimeAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("time.update");

    const existing = await prisma.timeEntry.findFirst({
      where: { id, deletedAt: null },
      select: { userId: true, minutes: true, date: true },
    });
    if (!existing) throw new NotFoundError("Time entry not found.");
    if (!canManageEntry(user, existing.userId)) {
      throw new ForbiddenError("You can only delete your own time entries.");
    }

    await prisma.timeEntry.update({ where: { id }, data: { deletedAt: new Date() } });

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "TimeEntry",
      entityId: id,
      summary: `Time entry deleted: ${formatMinutes(existing.minutes)} on ${existing.date.toISOString().slice(0, 10)}`,
    });
    revalidatePath("/time");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteTime");
  }
}
