import type { CurrentUser } from "@/lib/session";

export type NavIconKey =
  | "dashboard"
  | "clients"
  | "leads"
  | "projects"
  | "tasks"
  | "billing"
  | "reports"
  | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
  permission?: string;
  anyPermission?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/clients", label: "Clients", icon: "clients", permission: "clients.view" },
  { href: "/leads", label: "Leads", icon: "leads", permission: "leads.view" },
  { href: "/projects", label: "Projects", icon: "projects", permission: "projects.view" },
  { href: "/tasks", label: "Tasks", icon: "tasks", permission: "tasks.view" },
  {
    href: "/billing",
    label: "Billing",
    icon: "billing",
    anyPermission: ["invoices.view", "payments.view", "expenses.view"],
  },
  { href: "/reports", label: "Reports", icon: "reports", permission: "reports.view" },
  { href: "/settings", label: "Settings", icon: "settings", permission: "settings.manage" },
];

export function filterNavForUser(user: CurrentUser): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.anyPermission) {
      return item.anyPermission.some((p) => user.permissions.has(p));
    }
    if (item.permission) {
      return user.permissions.has(item.permission);
    }
    return true;
  });
}
