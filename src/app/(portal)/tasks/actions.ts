"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, taskSchema, taskStatusSchema } from "@/lib/validation";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { NotificationKind } from "@/generated/prisma/enums";
import { notify } from "@/lib/notifications";
import type { CurrentUser } from "@/lib/session";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function canAssign(user: CurrentUser): boolean {
  return user.permissions.has("tasks.assign");
}

async function assertRefs(projectId: string | null, assigneeId: string | null) {
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundError("The selected project no longer exists.");
  }
  if (assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: assigneeId, kind: "USER", status: "ACTIVE", deletedAt: null },
    });
    if (!assignee) throw new NotFoundError("The selected assignee is no longer active.");
  }
}

function revalidateTaskPaths(projectId: string | null) {
  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/c/projects/${projectId}`);
}

export async function createTaskAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks.create");
    const data = parseWithZod(taskSchema, input);

    if (data.assigneeId && data.assigneeId !== user.id && !canAssign(user)) {
      throw new ForbiddenError("You need permission to assign tasks to others.");
    }
    await assertRefs(data.projectId, data.assigneeId);

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        createdById: user.id,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        completedAt: data.status === "DONE" ? new Date() : null,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Task",
      entityId: task.id,
      summary: `Task created: ${task.title}`,
      metadata: { projectId: data.projectId },
    });
    if (data.assigneeId && data.assigneeId !== user.id) {
      await notify({
        userId: data.assigneeId,
        kind: NotificationKind.TASK,
        title: "Task assigned to you",
        body: task.title,
        link: "/tasks",
        entityType: "Task",
        entityId: task.id,
      });
    }
    revalidateTaskPaths(data.projectId);
    return { ok: true, id: task.id };
  } catch (error) {
    return errorResult(error, "createTask");
  }
}

export async function updateTaskAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks.update");
    const data = parseWithZod(taskSchema, input);

    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, assigneeId: true, projectId: true },
    });
    if (!existing) throw new NotFoundError("Task not found.");

    if (data.assigneeId !== existing.assigneeId && !canAssign(user)) {
      throw new ForbiddenError("You need permission to reassign tasks.");
    }
    await assertRefs(data.projectId, data.assigneeId);

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        completedAt: data.status === "DONE" ? new Date() : null,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Task",
      entityId: task.id,
      summary: `Task updated: ${task.title}`,
      metadata: { projectId: data.projectId },
    });
    if (data.assigneeId && data.assigneeId !== existing.assigneeId && data.assigneeId !== user.id) {
      await notify({
        userId: data.assigneeId,
        kind: NotificationKind.TASK,
        title: "Task assigned to you",
        body: task.title,
        link: "/tasks",
        entityType: "Task",
        entityId: task.id,
      });
    }
    revalidateTaskPaths(data.projectId);
    return { ok: true, id: task.id };
  } catch (error) {
    return errorResult(error, "updateTask");
  }
}

export async function setTaskStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks.update");
    const parsed = parseWithZod(taskStatusSchema, status);

    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true, projectId: true },
    });
    if (!existing) throw new NotFoundError("Task not found.");

    await prisma.task.update({
      where: { id },
      data: { status: parsed, completedAt: parsed === "DONE" ? new Date() : null },
    });

    await recordAudit({
      actorId: user.id,
      action: "STATUS_CHANGE",
      entity: "Task",
      entityId: id,
      summary: `Task status → ${parsed}: ${existing.title}`,
      metadata: { projectId: existing.projectId },
    });
    revalidateTaskPaths(existing.projectId);
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "setTaskStatus");
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("tasks.delete");

    const existing = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, title: true, projectId: true },
    });
    if (!existing) throw new NotFoundError("Task not found.");

    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });

    await recordAudit({
      actorId: user.id,
      action: "SOFT_DELETE",
      entity: "Task",
      entityId: id,
      summary: `Task deleted: ${existing.title}`,
      metadata: { projectId: existing.projectId },
    });
    revalidateTaskPaths(existing.projectId);
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteTask");
  }
}
