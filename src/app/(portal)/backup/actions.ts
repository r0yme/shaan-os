"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { createBackup, removeBackup } from "@/lib/backup";
import { AppError } from "@/lib/errors";
import { AuditAction } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createBackupAction(): Promise<ActionResult> {
  try {
    const user = await requirePermission("backup.manage");
    const filename = await createBackup();
    await recordAudit({
      actorId: user.id,
      action: AuditAction.EXPORT,
      entity: "Backup",
      entityId: filename,
      summary: `Database backup created: ${filename}`,
    });
    revalidatePath("/backup");
    return { ok: true, id: filename };
  } catch (error) {
    return errorResult(error, "createBackup");
  }
}

export async function deleteBackupAction(filename: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("backup.manage");
    await removeBackup(filename);
    await recordAudit({
      actorId: user.id,
      action: AuditAction.DELETE,
      entity: "Backup",
      entityId: filename,
      summary: `Database backup deleted: ${filename}`,
    });
    revalidatePath("/backup");
    return { ok: true, id: filename };
  } catch (error) {
    return errorResult(error, "deleteBackup");
  }
}
