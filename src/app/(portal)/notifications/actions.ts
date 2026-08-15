"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, notificationActionSchema } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("notifications.view");
    const parsed = parseWithZod(notificationActionSchema, { id });

    const result = await prisma.notification.updateMany({
      where: { id: parsed.id, userId: user.id, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundError("Notification not found.");
    }
    revalidatePath("/notifications");
    return { ok: true, id: parsed.id };
  } catch (error) {
    return errorResult(error, "markNotificationRead");
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requirePermission("notifications.view");
    await prisma.notification.updateMany({
      where: { userId: user.id, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/notifications");
    return { ok: true, id: "all" };
  } catch (error) {
    return errorResult(error, "markAllNotificationsRead");
  }
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("notifications.manage");
    const parsed = parseWithZod(notificationActionSchema, { id });

    const result = await prisma.notification.updateMany({
      where: { id: parsed.id, userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundError("Notification not found.");
    }
    await recordAudit({
      actorId: user.id,
      action: "SOFT_DELETE",
      entity: "Notification",
      entityId: parsed.id,
      summary: "Notification removed",
    });
    revalidatePath("/notifications");
    return { ok: true, id: parsed.id };
  } catch (error) {
    return errorResult(error, "deleteNotification");
  }
}
