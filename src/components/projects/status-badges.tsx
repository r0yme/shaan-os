import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const PROJECT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  PLANNING: { label: "Planning", tone: "default" },
  ACTIVE: { label: "Active", tone: "primary" },
  ON_HOLD: { label: "On hold", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "destructive" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const config = PROJECT_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const PROJECT_PRIORITY: Record<string, { label: string; tone: BadgeTone }> = {
  LOW: { label: "Low", tone: "default" },
  MEDIUM: { label: "Medium", tone: "primary" },
  HIGH: { label: "High", tone: "warning" },
};

export function ProjectPriorityBadge({ priority }: { priority: string }) {
  const config = PROJECT_PRIORITY[priority] ?? { label: priority, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const MILESTONE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "default" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export function MilestoneStatusBadge({ status }: { status: string }) {
  const config = MILESTONE_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
