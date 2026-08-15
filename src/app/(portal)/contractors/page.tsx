import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  ContractorsManager,
  type SerializedContractor,
} from "@/components/contractors/contractors-manager";

export const metadata: Metadata = { title: "Contractors" };

const STATUSES = new Set<string>(["ACTIVE", "INACTIVE"]);

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; project?: string }>;
}) {
  const user = await guardPermission("contractors.view");
  const { status, project } = await searchParams;

  const [contractors, projects] = await Promise.all([
    prisma.contractor.findMany({
      where: {
        deletedAt: null,
        ...(status && STATUSES.has(status) ? { status: status as "ACTIVE" | "INACTIVE" } : {}),
        ...(project ? { assignments: { some: { projectId: project } } } : {}),
      },
      include: {
        assignments: { include: { project: { select: { id: true, name: true } } } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: SerializedContractor[] = contractors.map((contractor) => ({
    id: contractor.id,
    name: contractor.name,
    email: contractor.email,
    phone: contractor.phone,
    company: contractor.company,
    specialty: contractor.specialty,
    rate: contractor.rate,
    status: contractor.status,
    notes: contractor.notes,
    projectIds: contractor.assignments.map((a) => a.project.id),
    projectNames: contractor.assignments.map((a) => a.project.name),
    createdAt: contractor.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading
        title="Contractors"
        description="Track external specialists and the projects they work on."
      />
      <ContractorsManager
        contractors={serialized}
        statusFilter={status && STATUSES.has(status) ? status : ""}
        projectFilter={project ?? ""}
        projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        canCreate={user.permissions.has("contractors.create")}
        canEdit={user.permissions.has("contractors.update")}
        canDelete={user.permissions.has("contractors.delete")}
      />
    </>
  );
}
