import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { contentDisposition } from "@/lib/files";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await requirePermission("files.download");

    const where: Prisma.SharedFileWhereInput = { id, deletedAt: null };
    if (user.kind === "CLIENT") {
      const profile = await prisma.client.findFirst({
        where: { portalUserId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!profile) throw new ForbiddenError("You can only download your own files.");
      where.OR = [
        { clientId: profile.id },
        { project: { clientId: profile.id } },
      ];
    }

    const file = await prisma.sharedFile.findFirst({
      where,
      select: { id: true, name: true, storageKey: true, mimeType: true },
    });
    if (!file) throw new NotFoundError("File not found.");

    const bytes = await readStoredFile(file.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": contentDisposition(file.name),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return new NextResponse("Not found", { status: 404 });
    }
    logger.error({ err: error }, "File download failed");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
