import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Messages" };

export default function ClientMessagesPage() {
  return (
    <ModulePlaceholder
      title="Messages"
      description="Messaging with your service provider ships in a later phase."
    />
  );
}
