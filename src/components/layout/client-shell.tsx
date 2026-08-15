"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquareText, ReceiptText, FolderOpen, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";

const CLIENT_NAV = [
  { href: "/c", label: "Overview", icon: Home },
  { href: "/c/messages", label: "Messages", icon: MessageSquareText },
  { href: "/c/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/c/payments", label: "Payments", icon: Banknote },
  { href: "/c/files", label: "Files", icon: FolderOpen },
];

export function ClientShell({
  user,
  children,
}: {
  user: { name: string | null; email: string | null; image: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <Logo href="/c" />
          <span className="hidden rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary sm:inline">
            Client portal
          </span>
        </div>
        <div className="flex items-center gap-1">
          {CLIENT_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={user.name} image={user.image} className="h-7 w-7 text-xs" />
            <span className="max-w-32 truncate text-sm font-medium text-foreground">
              {user.name ?? user.email}
            </span>
          </div>
          <SignOutButton variant="ghost" className="px-2" />
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Shaan OS · Client portal
      </footer>
    </div>
  );
}
