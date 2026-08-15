import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <ModulePlaceholder
      title="Tasks"
      description="Task boards, assignments and time tracking ship in Phase 4."
    />
  );
}
