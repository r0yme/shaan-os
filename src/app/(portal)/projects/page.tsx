import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  ProjectsManager,
  type SerializedProject,
} from "@/components/projects/projects-manager";
import { UserKind } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Projects" };

const STATUS_VALUES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await guardPermission("projects.view");
  const { q, status } = await searchParams;

  const where = {
    deletedAt: null as Date | null,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status && STATUS_VALUES.includes(status) ? { status: status as never } : {}),
  };

  const [projects, clients, managers] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { kind: UserKind.USER, status: "ACTIVE", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: SerializedProject[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    clientId: project.clientId,
    clientName: project.client?.name ?? null,
    managerId: project.managerId,
    managerName: project.manager?.name ?? null,
    budget: project.budget,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    deadline: project.deadline ? project.deadline.toISOString() : null,
    notes: project.notes,
    createdAt: project.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading
        title="Projects"
        description="Plan, track and deliver work across your workspace."
      />
      <ProjectsManager
        projects={serialized}
        q={q ?? ""}
        status={status ?? ""}
        clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
        managerOptions={managers.map((m) => ({ id: m.id, name: m.name ?? m.id }))}
      />
    </>
  );
}
