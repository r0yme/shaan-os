import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  FilesManager,
  type SerializedSharedFile,
} from "@/components/files/files-manager";

export const metadata: Metadata = { title: "Files" };

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; client?: string }>;
}) {
  const user = await guardPermission("files.view");
  const { project: projectParam, client: clientParam } = await searchParams;

  const where = {
    deletedAt: null as null,
    ...(projectParam ? { projectId: projectParam } : {}),
    ...(clientParam ? { clientId: clientParam } : {}),
  };

  const [files, projects, clients] = await Promise.all([
    prisma.sharedFile.findMany({
      where,
      include: {
        project: { select: { name: true } },
        client: { select: { name: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const serialized: SerializedSharedFile[] = files.map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
    projectName: file.project?.name ?? null,
    clientName: file.client?.name ?? null,
    uploadedByName: file.uploadedBy?.name ?? null,
  }));

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const weekBytes = files
    .filter((file) => file.createdAt >= weekStart)
    .reduce((sum, file) => sum + file.size, 0);

  return (
    <>
      <PageHeading
        title="Files"
        description="Share documents and assets with your team and clients."
      />
      <FilesManager
        files={serialized}
        projectFilter={projectParam ?? ""}
        clientFilter={clientParam ?? ""}
        totalBytes={totalBytes}
        weekBytes={weekBytes}
        projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
        canUpload={user.permissions.has("files.upload")}
        canDelete={user.permissions.has("files.delete")}
      />
    </>
  );
}
