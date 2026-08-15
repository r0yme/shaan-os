import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const USER_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  INVITED: { label: "Invited", tone: "primary" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
  INACTIVE: { label: "Inactive", tone: "destructive" },
};

export function UserStatusBadge({ status }: { status: string }) {
  const config = USER_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const ROLE_LABELS: Record<string, { label: string; tone: BadgeTone }> = {
  OWNER: { label: "Owner", tone: "destructive" },
  ADMIN: { label: "Admin", tone: "primary" },
  PROJECT_MANAGER: { label: "Project Manager", tone: "warning" },
  EMPLOYEE: { label: "Employee", tone: "default" },
  CLIENT: { label: "Client", tone: "outline" },
};

export function RoleBadge({ role }: { role: string }) {
  const config = ROLE_LABELS[role] ?? { label: role, tone: "outline" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
