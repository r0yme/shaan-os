import type { CurrentUser } from "@/lib/session";

export type NavIconKey =
  | "dashboard"
  | "search"
  | "clients"
  | "leads"
  | "employees"
  | "contractors"
  | "projects"
  | "tasks"
  | "time"
  | "calendar"
  | "files"
  | "messages"
  | "notifications"
  | "approvals"
  | "billing"
  | "reports"
  | "finance"
  | "audit"
  | "security"
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
  { href: "/search", label: "Search", icon: "search", permission: "search.global" },
  { href: "/clients", label: "Clients", icon: "clients", permission: "clients.view" },
  { href: "/leads", label: "Leads", icon: "leads", permission: "leads.view" },
  { href: "/employees", label: "Employees", icon: "employees", permission: "employees.view" },
  {
    href: "/contractors",
    label: "Contractors",
    icon: "contractors",
    permission: "contractors.view",
  },
  { href: "/projects", label: "Projects", icon: "projects", permission: "projects.view" },
  { href: "/tasks", label: "Tasks", icon: "tasks", permission: "tasks.view" },
  { href: "/time", label: "Time", icon: "time", permission: "time.view" },
  { href: "/calendar", label: "Calendar", icon: "calendar", permission: "calendar.view" },
  { href: "/files", label: "Files", icon: "files", permission: "files.view" },
  { href: "/messages", label: "Messages", icon: "messages", permission: "messages.view" },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "notifications",
    permission: "notifications.view",
  },
  { href: "/approvals", label: "Approvals", icon: "approvals", permission: "approvals.view" },
  {
    href: "/billing",
    label: "Billing",
    icon: "billing",
    anyPermission: ["invoices.view", "payments.view", "expenses.view"],
  },
  { href: "/reports", label: "Reports", icon: "reports", permission: "reports.view" },
  { href: "/finance", label: "Finance", icon: "finance", permission: "finance.view" },
  { href: "/audit", label: "Audit", icon: "audit", permission: "audit.view" },
  { href: "/security", label: "Security", icon: "security", permission: "auth.manage" },
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
