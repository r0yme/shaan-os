import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <ModulePlaceholder
      title="Projects"
      description="Projects, milestones and delivery tracking ship in Phase 3."
    />
  );
}
