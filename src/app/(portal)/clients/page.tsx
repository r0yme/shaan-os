import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <ModulePlaceholder
      title="Clients"
      description="Client directory, profiles, leads and pipelines ship in Phase 2."
    />
  );
}
