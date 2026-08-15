"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { contractorSchema, parseWithZod } from "@/lib/validation";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function validateProjects(projectIds: string[]): Promise<void> {
  const found = await prisma.project.findMany({
    where: { id: { in: projectIds }, deletedAt: null },
    select: { id: true },
  });
  if (found.length !== projectIds.length) {
    throw new ConflictError("One or more selected projects no longer exist.");
  }
}

async function assertEmailFree(email: string | null, excludeId?: string): Promise<void> {
  if (!email) return;
  const existing = await prisma.contractor.findFirst({
    where: { email, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) throw new ConflictError("A contractor with this email already exists.");
}

export async function createContractorAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("contractors.create");
    const data = parseWithZod(contractorSchema, input);
    await assertEmailFree(data.email);
    await validateProjects(data.projectIds);

    const contractor = await prisma.contractor.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        specialty: data.specialty,
        rate: data.rate,
        status: data.status,
        notes: data.notes,
        createdById: user.id,
        assignments: {
          create: data.projectIds.map((projectId) => ({ projectId })),
        },
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Contractor",
      entityId: contractor.id,
      summary: `Contractor created: ${contractor.name}`,
    });
    revalidatePath("/contractors");
    return { ok: true, id: contractor.id };
  } catch (error) {
    return errorResult(error, "createContractor");
  }
}

export async function updateContractorAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("contractors.update");
    const data = parseWithZod(contractorSchema, input);
    await assertEmailFree(data.email, id);
    await validateProjects(data.projectIds);

    const existing = await prisma.contractor.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Contractor not found.");

    await prisma.$transaction(async (tx) => {
      await tx.contractorProject.deleteMany({ where: { contractorId: id } });
      await tx.contractor.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          specialty: data.specialty,
          rate: data.rate,
          status: data.status,
          notes: data.notes,
          assignments: {
            create: data.projectIds.map((projectId) => ({ projectId })),
          },
        },
      });
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Contractor",
      entityId: id,
      summary: `Contractor updated: ${data.name}`,
    });
    revalidatePath("/contractors");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "updateContractor");
  }
}

export async function deleteContractorAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("contractors.delete");

    const existing = await prisma.contractor.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Contractor not found.");

    await prisma.contractor.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "Contractor",
      entityId: id,
      summary: `Contractor deleted: ${existing.name}`,
    });
    revalidatePath("/contractors");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteContractor");
  }
}
