import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const TASK_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  TODO: { label: "To do", tone: "default" },
  IN_PROGRESS: { label: "In progress", tone: "primary" },
  IN_REVIEW: { label: "In review", tone: "warning" },
  DONE: { label: "Done", tone: "success" },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const config = TASK_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const TASK_PRIORITY: Record<string, { label: string; tone: BadgeTone }> = {
  LOW: { label: "Low", tone: "default" },
  MEDIUM: { label: "Medium", tone: "primary" },
  HIGH: { label: "High", tone: "warning" },
};

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const config = TASK_PRIORITY[priority] ?? { label: priority, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
