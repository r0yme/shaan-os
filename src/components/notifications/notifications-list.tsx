"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, MessageSquareText, ListTodo, FolderOpen, Bell, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(portal)/notifications/actions";
import type { NotificationKind } from "@/generated/prisma/enums";

export interface SerializedNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  APPROVAL: BadgeCheck,
  MESSAGE: MessageSquareText,
  TASK: ListTodo,
  FILE: FolderOpen,
  SYSTEM: Bell,
};

type Filter = "all" | "unread";

export function NotificationsList({
  notifications,
  canManage,
}: {
  notifications: SerializedNotification[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? notifications : notifications.filter((n) => !n.read)),
    [filter, notifications],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelect = async (notification: SerializedNotification) => {
    if (!notification.read) {
      await markNotificationReadAction(notification.id);
      router.refresh();
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotificationAction(id);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    router.refresh();
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === tab.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "No unread notifications" : "No notifications"}
          description={filter === "unread" ? "You have read everything." : "Activity from your workspace will appear here."}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
          {visible.map((notification) => {
            const Icon = KIND_ICONS[notification.kind];
            return (
              <li key={notification.id} className={cn("flex items-start gap-3 p-3", !notification.read && "bg-accent/30")}>
                <button
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      notification.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {!notification.read && <Badge tone="primary" className="h-2 w-2 rounded-full p-0" aria-label="Unread" />}
                      <span className="truncate text-sm font-medium text-foreground">{notification.title}</span>
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 block text-sm text-muted-foreground">{notification.body}</span>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete notification"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
