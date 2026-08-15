import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  NotificationsList,
  type SerializedNotification,
} from "@/components/notifications/notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await guardPermission("notifications.view");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      kind: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });

  const serialized: SerializedNotification[] = notifications.map((notification) => ({
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  }));

  const unreadCount = serialized.filter((notification) => !notification.read).length;

  return (
    <>
      <PageHeading
        title="Notifications"
        description={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
            : "You are all caught up."
        }
      />
      <NotificationsList notifications={serialized} canManage={user.permissions.has("notifications.manage")} />
    </>
  );
}
