import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Financial and operational reporting ships in Phase 6."
    />
  );
}
