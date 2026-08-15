"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, projectSchema, milestoneSchema } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function assertReferents(clientId: string | null, managerId: string | null) {
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
    if (!client) throw new NotFoundError("The selected client no longer exists.");
  }
  if (managerId) {
    const manager = await prisma.user.findFirst({ where: { id: managerId, deletedAt: null } });
    if (!manager) throw new NotFoundError("The selected manager is no longer active.");
  }
}

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects.create");
    const data = parseWithZod(projectSchema, input);
    await assertReferents(data.clientId, data.managerId);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        clientId: data.clientId,
        managerId: data.managerId,
        budget: data.budget,
        startDate: data.startDate,
        deadline: data.deadline,
        notes: data.notes,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Project",
      entityId: project.id,
      summary: `Project created: ${project.name}`,
    });
    revalidatePath("/projects");
    return { ok: true, id: project.id };
  } catch (error) {
    return errorResult(error, "createProject");
  }
}

export async function updateProjectAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects.update");
    const data = parseWithZod(projectSchema, input);
    await assertReferents(data.clientId, data.managerId);

    const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError("Project not found.");

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        clientId: data.clientId,
        managerId: data.managerId,
        budget: data.budget,
        startDate: data.startDate,
        deadline: data.deadline,
        notes: data.notes,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Project",
      entityId: project.id,
      summary: `Project updated: ${project.name}`,
    });
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return { ok: true, id: project.id };
  } catch (error) {
    return errorResult(error, "updateProject");
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("projects.delete");

    const existing = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Project not found.");

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAudit({
      actorId: user.id,
      action: "SOFT_DELETE",
      entity: "Project",
      entityId: id,
      summary: `Project deleted: ${existing.name}`,
    });
    revalidatePath("/projects");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteProject");
  }
}

export async function createMilestoneAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("milestones.create");

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("Project not found.");

    const data = parseWithZod(milestoneSchema, input);
    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Milestone",
      entityId: milestone.id,
      summary: `Milestone created: ${milestone.title}`,
      metadata: { projectId },
    });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, id: milestone.id };
  } catch (error) {
    return errorResult(error, "createMilestone");
  }
}

export async function updateMilestoneAction(
  milestoneId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("milestones.update");

    const existing = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      select: { id: true, projectId: true, title: true },
    });
    if (!existing) throw new NotFoundError("Milestone not found.");

    const data = parseWithZod(milestoneSchema, input);
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Milestone",
      entityId: milestone.id,
      summary: `Milestone updated: ${milestone.title}`,
      metadata: { projectId: existing.projectId },
    });
    revalidatePath(`/projects/${existing.projectId}`);
    return { ok: true, id: milestone.id };
  } catch (error) {
    return errorResult(error, "updateMilestone");
  }
}

export async function deleteMilestoneAction(milestoneId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("milestones.delete");

    const existing = await prisma.milestone.findFirst({
      where: { id: milestoneId },
      select: { id: true, projectId: true, title: true },
    });
    if (!existing) throw new NotFoundError("Milestone not found.");

    await prisma.milestone.delete({ where: { id: milestoneId } });

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "Milestone",
      entityId: milestoneId,
      summary: `Milestone deleted: ${existing.title}`,
      metadata: { projectId: existing.projectId },
    });
    revalidatePath(`/projects/${existing.projectId}`);
    return { ok: true, id: milestoneId };
  } catch (error) {
    return errorResult(error, "deleteMilestone");
  }
}
