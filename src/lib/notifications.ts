import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { NotificationKind } from "@/generated/prisma/enums";

export interface NotificationInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * Creates an in-app notification. Notification writes must never break the
 * primary business flow, so failures are logged and swallowed.
 */
export async function notify(input: NotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to write notification");
  }
}

export async function notifyMany(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to write notifications");
  }
}

/** Team members (kind USER) who hold a permission, e.g. approvals.manage. */
export async function userIdsWithPermission(key: string, excludeId?: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      kind: "USER",
      status: "ACTIVE",
      deletedAt: null,
      roles: { some: { role: { permissions: { some: { permission: { key } } } } } },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}
