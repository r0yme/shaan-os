import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { readBackup } from "@/lib/backup";
import { contentDisposition } from "@/lib/files";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    await requirePermission("backup.manage");
    const bytes = await readBackup(name);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": contentDisposition(name),
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
    logger.error({ err: error }, "Backup download failed");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
