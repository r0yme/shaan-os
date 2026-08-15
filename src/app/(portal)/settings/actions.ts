"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { businessProfileSchema, parseWithZod } from "@/lib/validation";
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

export async function updateBusinessProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("settings.manage");
    const data = parseWithZod(businessProfileSchema, input);

    const profile = await prisma.businessProfile.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        invoicePrefix: data.invoicePrefix ?? "INV",
        updatedBy: user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: AuditAction.SETTINGS_CHANGE,
      entity: "BusinessProfile",
      entityId: profile.id,
      summary: "Workspace settings updated",
    });
    revalidatePath("/settings");
    revalidatePath("/c");
    return { ok: true, id: profile.id };
  } catch (error) {
    return errorResult(error, "updateBusinessProfile");
  }
}
