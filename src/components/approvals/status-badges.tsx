import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const APPROVAL_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "destructive" },
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  const config = APPROVAL_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const APPROVAL_TYPE: Record<string, { label: string; tone: BadgeTone }> = {
  INVOICE: { label: "Invoice", tone: "primary" },
  EXPENSE: { label: "Expense", tone: "default" },
  MILESTONE: { label: "Milestone", tone: "primary" },
};

export function ApprovalTypeBadge({ type }: { type: string }) {
  const config = APPROVAL_TYPE[type] ?? { label: type, tone: "outline" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
