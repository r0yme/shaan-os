"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, sharedFileMetadataSchema } from "@/lib/validation";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { removeStoredFile, saveUploadBytes, sanitizeFileName } from "@/lib/storage";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function assertRefs(projectId: string | null, clientId: string | null) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError("The selected project no longer exists.");
  }
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundError("The selected client no longer exists.");
  }
}

async function assertClientScope(
  portalUserId: string,
  projectId: string | null,
  clientId: string | null,
) {
  const profile = await prisma.client.findFirst({
    where: { portalUserId, deletedAt: null },
    select: { id: true },
  });
  if (!profile) throw new ForbiddenError("You can only upload files to your own account.");
  if (clientId && clientId !== profile.id) {
    throw new ForbiddenError("You can only link files to your own account.");
  }
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, clientId: profile.id, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new ForbiddenError("The selected project is not yours.");
  }
}

export async function uploadFileAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("files.upload");

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("Choose a file to upload.");
    if (file.size === 0) throw new ValidationError("The selected file is empty.");

    const data = parseWithZod(sharedFileMetadataSchema, {
      name: file.name,
      mimeType: file.type || null,
      size: file.size,
      projectId: formData.get("projectId"),
      clientId: formData.get("clientId"),
    });

    await assertRefs(data.projectId, data.clientId);
    if (user.kind === "CLIENT") {
      await assertClientScope(user.id, data.projectId, data.clientId);
    }

    const storageKey = await saveUploadBytes(new Uint8Array(await file.arrayBuffer()));
    const sharedFile = await prisma.sharedFile.create({
      data: {
        name: sanitizeFileName(data.name),
        storageKey,
        mimeType: data.mimeType,
        size: data.size,
        projectId: data.projectId,
        clientId: data.clientId,
        uploadedById: user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "SharedFile",
      entityId: sharedFile.id,
      summary: `File uploaded: ${sharedFile.name}`,
    });
    revalidatePath("/files");
    revalidatePath("/c/files");
    return { ok: true, id: sharedFile.id };
  } catch (error) {
    return errorResult(error, "uploadFile");
  }
}

export async function deleteFileAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("files.delete");

    const existing = await prisma.sharedFile.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, storageKey: true },
    });
    if (!existing) throw new NotFoundError("File not found.");

    await prisma.sharedFile.update({ where: { id }, data: { deletedAt: new Date() } });
    await removeStoredFile(existing.storageKey);

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "SharedFile",
      entityId: id,
      summary: `File deleted: ${existing.name}`,
    });
    revalidatePath("/files");
    revalidatePath("/c/files");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteFile");
  }
}
