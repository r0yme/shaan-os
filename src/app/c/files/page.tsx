import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeading } from "@/components/page-heading";
import {
  ClientFilesView,
  type ClientSerializedFile,
} from "@/components/files/client-files-view";

export const metadata: Metadata = { title: "Files" };

export default async function ClientFilesPage() {
  const user = await requireUser();

  const clientProfile = await prisma.client.findFirst({
    where: { portalUserId: user.id, deletedAt: null },
    select: { id: true },
  });

  const files = clientProfile
    ? await prisma.sharedFile.findMany({
        where: {
          deletedAt: null,
          OR: [{ clientId: clientProfile.id }, { project: { clientId: clientProfile.id } }],
        },
        include: {
          project: { select: { name: true } },
          uploadedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const serialized: ClientSerializedFile[] = files.map((file) => ({
    id: file.id,
    name: file.name,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
    projectName: file.project?.name ?? null,
    uploadedByName: file.uploadedBy?.name ?? null,
  }));

  return (
    <>
      <PageHeading
        title="Files"
        description="Documents and assets shared with your account."
      />
      <ClientFilesView files={serialized} />
    </>
  );
}
