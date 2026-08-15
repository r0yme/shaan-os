import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const CLIENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "default" },
};

export function ClientStatusBadge({ status }: { status: string }) {
  const config = CLIENT_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const CLIENT_KIND: Record<string, string> = {
  BUSINESS: "Business",
  INDIVIDUAL: "Individual",
};

export function ClientKindBadge({ kind }: { kind: string }) {
  return <span className="text-sm text-muted-foreground">{CLIENT_KIND[kind] ?? kind}</span>;
}

const LEAD_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  NEW: { label: "New", tone: "default" },
  CONTACTED: { label: "Contacted", tone: "primary" },
  QUALIFIED: { label: "Qualified", tone: "warning" },
  PROPOSAL: { label: "Proposal", tone: "warning" },
  WON: { label: "Won", tone: "success" },
  LOST: { label: "Lost", tone: "destructive" },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const config = LEAD_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const LEAD_SOURCE: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social media",
  EMAIL: "Email",
  CALL: "Call",
  OUTREACH: "Outreach",
  OTHER: "Other",
};

export function LeadSourceLabel({ source }: { source: string }) {
  return <span className="text-sm text-muted-foreground">{LEAD_SOURCE[source] ?? source}</span>;
}
