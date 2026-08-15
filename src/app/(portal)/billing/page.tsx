import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <ModulePlaceholder
      title="Billing"
      description="Invoices, payments and expenses ship in Phase 5."
    />
  );
}
