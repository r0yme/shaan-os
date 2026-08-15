import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const INVOICE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "default" },
  SENT: { label: "Sent", tone: "primary" },
  PAID: { label: "Paid", tone: "success" },
  VOID: { label: "Void", tone: "destructive" },
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = INVOICE_STATUS[status] ?? { label: status, tone: "default" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const PAYMENT_METHOD: Record<string, { label: string; tone: BadgeTone }> = {
  CASH: { label: "Cash", tone: "default" },
  BANK_TRANSFER: { label: "Bank transfer", tone: "primary" },
  CREDIT_CARD: { label: "Credit card", tone: "warning" },
  OTHER: { label: "Other", tone: "outline" },
};

export function PaymentMethodBadge({ method }: { method: string }) {
  const config = PAYMENT_METHOD[method] ?? { label: method, tone: "outline" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const EXPENSE_CATEGORY: Record<string, { label: string; tone: BadgeTone }> = {
  SOFTWARE: { label: "Software", tone: "primary" },
  HARDWARE: { label: "Hardware", tone: "primary" },
  SERVICES: { label: "Services", tone: "default" },
  TRAVEL: { label: "Travel", tone: "warning" },
  MEALS: { label: "Meals", tone: "warning" },
  OFFICE: { label: "Office", tone: "default" },
  OTHER: { label: "Other", tone: "outline" },
};

export function ExpenseCategoryBadge({ category }: { category: string }) {
  const config = EXPENSE_CATEGORY[category] ?? { label: category, tone: "outline" as BadgeTone };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
