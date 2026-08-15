"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { calendarEventSchema, parseWithZod } from "@/lib/validation";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/session";
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

function canManageEvent(user: CurrentUser, creatorId: string | null): boolean {
  return (creatorId !== null && user.id === creatorId) || user.permissions.has("employees.view");
}

export async function createCalendarEventAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("calendar.create");
    const data = parseWithZod(calendarEventSchema, input);
    await assertRefs(data.projectId, data.clientId);

    const event = await prisma.calendarEvent.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay,
        projectId: data.projectId,
        clientId: data.clientId,
        createdById: user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "CalendarEvent",
      entityId: event.id,
      summary: `Calendar event created: ${event.title}`,
    });
    revalidatePath("/calendar");
    return { ok: true, id: event.id };
  } catch (error) {
    return errorResult(error, "createCalendarEvent");
  }
}

export async function updateCalendarEventAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("calendar.update");
    const data = parseWithZod(calendarEventSchema, input);
    await assertRefs(data.projectId, data.clientId);

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, deletedAt: null },
      select: { createdById: true },
    });
    if (!existing) throw new NotFoundError("Calendar event not found.");
    if (!canManageEvent(user, existing.createdById)) {
      throw new ForbiddenError("You can only edit events you created.");
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        allDay: data.allDay,
        projectId: data.projectId,
        clientId: data.clientId,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "CalendarEvent",
      entityId: event.id,
      summary: `Calendar event updated: ${event.title}`,
    });
    revalidatePath("/calendar");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "updateCalendarEvent");
  }
}

export async function deleteCalendarEventAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("calendar.delete");

    const existing = await prisma.calendarEvent.findFirst({
      where: { id, deletedAt: null },
      select: { createdById: true, title: true },
    });
    if (!existing) throw new NotFoundError("Calendar event not found.");
    if (!canManageEvent(user, existing.createdById)) {
      throw new ForbiddenError("You can only delete events you created.");
    }

    await prisma.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "CalendarEvent",
      entityId: id,
      summary: `Calendar event deleted: ${existing.title}`,
    });
    revalidatePath("/calendar");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteCalendarEvent");
  }
}
