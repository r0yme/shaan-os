"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { logger } from "@/lib/logger";
import { parseWithZod, passwordSchema, idSchema } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import { AuditAction } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";
import { z } from "zod";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const adminResetPasswordSchema = z.object({
  userId: idSchema,
  password: passwordSchema,
});

export async function adminResetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("auth.manage");
    const data = parseWithZod(adminResetPasswordSchema, input);

    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target || target.deletedAt) {
      throw new NotFoundError("That user could not be found.");
    }
    if (target.kind === "CLIENT") {
      throw new AppError(400, "Client portal accounts are managed in the Clients module.");
    }

    const passwordHash = await hashPassword(data.password);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });

    await recordAudit({
      actorId: user.id,
      action: AuditAction.PASSWORD_CHANGE,
      entity: "User",
      entityId: target.id,
      summary: `Password reset for ${target.name ?? target.email ?? "user"}`,
    });
    revalidatePath("/security");
    return { ok: true, id: target.id };
  } catch (error) {
    return errorResult(error, "adminResetPassword");
  }
}

export async function forceSignOutAllAction(): Promise<ActionResult> {
  try {
    const user = await requirePermission("auth.manage");

    await prisma.user.updateMany({
      where: { kind: "USER", deletedAt: null },
      data: { tokenVersion: { increment: 1 } },
    });

    await recordAudit({
      actorId: user.id,
      action: AuditAction.LOGOUT,
      entity: "User",
      summary: "All workspace sessions invalidated",
    });
    revalidatePath("/security");
    return { ok: true, id: "all-sessions" };
  } catch (error) {
    return errorResult(error, "forceSignOutAll");
  }
}
