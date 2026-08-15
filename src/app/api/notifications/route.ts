import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { NotificationKind } from "@/generated/prisma/enums";

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
}

export async function GET() {
  try {
    const user = await requirePermission("notifications.view");
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        link: true,
        entityType: true,
        entityId: true,
        readAt: true,
        createdAt: true,
      },
    });
    const dto: NotificationDto[] = notifications.map((notification) => ({
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      entityType: notification.entityType,
      entityId: notification.entityId,
      read: notification.readAt !== null,
      createdAt: notification.createdAt.toISOString(),
    }));
    return NextResponse.json({
      unreadCount: dto.filter((notification) => !notification.read).length,
      notifications: dto,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error({ err: error }, "Notifications feed failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
