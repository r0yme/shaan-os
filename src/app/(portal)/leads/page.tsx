import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { LeadBoard, type SerializedLead } from "@/components/leads/lead-board";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const user = await guardPermission("leads.view");

  const leads = await prisma.lead.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      value: true,
      source: true,
      status: true,
      notes: true,
      clientId: true,
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const serialized: SerializedLead[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    value: lead.value,
    source: lead.source,
    status: lead.status,
    notes: lead.notes,
    clientId: lead.clientId,
    assigneeName: lead.assignee?.name ?? null,
  }));

  return (
    <>
      <PageHeading
        title="Leads"
        description="Track potential clients from first contact to conversion."
      />
      <LeadBoard leads={serialized} canConvert={user.permissions.has("leads.convert")} />
    </>
  );
}
