import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { aiEnabled, aiProvider } from "@/lib/ai";
import { PageHeading } from "@/components/page-heading";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  await guardPermission("ai.use");

  const [clients, projects, leads] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, company: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeading
        title="AI Assistant"
        description="Chat, draft, summarize and score using your workspace data."
      />
      <AssistantPanel
        enabled={aiEnabled()}
        provider={aiProvider()}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        leads={leads.map((l) => ({ id: l.id, name: l.name, company: l.company }))}
      />
    </>
  );
}
