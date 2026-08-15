import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const CONTRACTOR_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "destructive" },
};

export function ContractorStatusBadge({ status }: { status: string }) {
  const config = CONTRACTOR_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
