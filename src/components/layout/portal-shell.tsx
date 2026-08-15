"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Search,
  Users,
  Radar,
  ContactRound,
  HardHat,
  FolderKanban,
  ListTodo,
  Clock,
  Calendar,
  FolderOpen,
  MessageSquareText,
  Bell,
  BadgeCheck,
  Receipt,
  BarChart3,
  ScrollText,
  Settings,
} from "lucide-react";
import type { NavItem, NavIconKey } from "@/config/nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  search: Search,
  clients: Users,
  leads: Radar,
  employees: ContactRound,
  contractors: HardHat,
  projects: FolderKanban,
  tasks: ListTodo,
  time: Clock,
  calendar: Calendar,
  files: FolderOpen,
  messages: MessageSquareText,
  notifications: Bell,
  approvals: BadgeCheck,
  billing: Receipt,
  reports: BarChart3,
  audit: ScrollText,
  settings: Settings,
} satisfies Record<NavIconKey, typeof LayoutDashboard>;

export interface PortalUser {
  name: string | null;
  email: string | null;
  image: string | null;
  roleKeys: string[];
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const Icon = NAV_ICONS[item.icon];
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-sidebar-foreground hover:bg-accent/60 hover:text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function PortalShell({
  items,
  user,
  children,
}: {
  items: NavItem[];
  user: PortalUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} onNavigate={close} />
        ))}
      </nav>
      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2 px-2">
          <Avatar name={user.name} image={user.image} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name ?? user.email ?? "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.roleKeys.join(", ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell allHref="/notifications" align="start" />
          <ThemeToggle />
          <SignOutButton className="ml-1 flex-1" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Logo href="/dashboard" />
        </div>
        <ThemeToggle />
      </header>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar}
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={close}
            aria-hidden
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3 text-background hover:bg-transparent"
              onClick={close}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
