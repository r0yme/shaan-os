"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, leadSchema, leadStatusSchema } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  if (isUniqueError(error)) {
    return { ok: false, error: "A lead with this email already exists." };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createLeadAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("leads.create");
    const data = parseWithZod(leadSchema, input);

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        source: data.source,
        status: data.status,
        value: data.value,
        notes: data.notes,
        assigneeId: data.assigneeId ?? user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Lead",
      entityId: lead.id,
      summary: `Lead created: ${lead.name}`,
    });
    revalidatePath("/leads");
    return { ok: true, id: lead.id };
  } catch (error) {
    return errorResult(error, "createLead");
  }
}

export async function updateLeadAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("leads.update");
    const data = parseWithZod(leadSchema, input);

    const existing = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Lead not found.");

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        source: data.source,
        status: data.status,
        value: data.value,
        notes: data.notes,
        assigneeId: data.assigneeId ?? undefined,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Lead",
      entityId: lead.id,
      summary: `Lead updated: ${lead.name}`,
    });
    revalidatePath("/leads");
    return { ok: true, id: lead.id };
  } catch (error) {
    return errorResult(error, "updateLead");
  }
}

export async function setLeadStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("leads.update");
    const parsed = parseWithZod(leadStatusSchema, status);

    const existing = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Lead not found.");

    await prisma.lead.update({
      where: { id },
      data: { status: parsed },
    });

    await recordAudit({
      actorId: user.id,
      action: "STATUS_CHANGE",
      entity: "Lead",
      entityId: id,
      summary: `Lead status → ${status}: ${existing.name}`,
    });
    revalidatePath("/leads");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "setLeadStatus");
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("leads.delete");

    const existing = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Lead not found.");

    await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });

    await recordAudit({
      actorId: user.id,
      action: "SOFT_DELETE",
      entity: "Lead",
      entityId: id,
      summary: `Lead deleted: ${existing.name}`,
    });
    revalidatePath("/leads");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteLead");
  }
}
