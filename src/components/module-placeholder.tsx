import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/page-heading";

export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeading title={title} />
      <EmptyState
        icon={Hammer}
        title={`${title} module`}
        description={description}
      />
    </>
  );
}
