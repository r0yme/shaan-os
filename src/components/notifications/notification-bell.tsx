"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BadgeCheck, MessageSquareText, ListTodo, FolderOpen, ReceiptText, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { NotificationDto } from "@/app/api/notifications/route";
import type { NotificationKind } from "@/generated/prisma/enums";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(portal)/notifications/actions";

const KIND_ICONS: Record<NotificationKind, typeof Bell> = {
  APPROVAL: BadgeCheck,
  MESSAGE: MessageSquareText,
  TASK: ListTodo,
  FILE: FolderOpen,
  SYSTEM: Bell,
  PAYMENT: ReceiptText,
};

function useNotificationsFeed(open: boolean) {
  const [state, setState] = useState<{ unreadCount: number; notifications: NotificationDto[] } | null>(
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setState({ unreadCount: data.unreadCount, notifications: data.notifications });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ unreadCount: 0, notifications: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return { state, router };
}

export function NotificationBell({ allHref, align = "end" }: { allHref?: string; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { state, router } = useNotificationsFeed(open);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadCount = state?.unreadCount ?? 0;
  const recent = (state?.notifications ?? []).filter((notification) => !notification.read).slice(0, 8);

  const handleSelect = async (notification: NotificationDto) => {
    setOpen(false);
    if (!notification.read) {
      await markNotificationReadAction(notification.id);
      router.refresh();
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setOpen(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute z-40 mt-2 w-80 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleMarkAllRead}>
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">You are all caught up.</p>
            ) : (
              recent.map((notification) => {
                const Icon = KIND_ICONS[notification.kind];
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
                      !notification.read && "bg-accent/30",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        notification.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                      {notification.body && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {notification.body}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {allHref && (
            <div className="border-t border-border p-1.5">
              <Link
                href={allHref}
                onClick={() => setOpen(false)}
                className="block rounded-sm px-2.5 py-1.5 text-center text-sm font-medium text-primary transition-colors hover:bg-accent"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
