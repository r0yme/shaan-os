import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { contentDisposition } from "@/lib/files";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await requirePermission("payments.view");

    const where: { id: string } = { id };
    if (user.kind === "CLIENT") {
      const profile = await prisma.client.findFirst({
        where: { portalUserId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!profile) throw new ForbiddenError("You can only download your own payment proofs.");
      where.id = id;
      const ownPayment = await prisma.payment.findFirst({
        where: {
          id,
          OR: [
            { clientId: profile.id },
            { invoice: { clientId: profile.id } },
            { project: { clientId: profile.id } },
            { task: { project: { clientId: profile.id } } },
          ],
        },
        select: { id: true },
      });
      if (!ownPayment) throw new ForbiddenError("You can only download your own payment proofs.");
    }

    const payment = await prisma.payment.findUnique({
      where,
      select: { id: true, proofStorageKey: true, proofFileName: true, proofMimeType: true },
    });
    if (!payment) throw new NotFoundError("Payment not found.");
    if (!payment.proofStorageKey) throw new NotFoundError("This payment has no proof attached.");

    const bytes = await readStoredFile(payment.proofStorageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": payment.proofMimeType ?? "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": contentDisposition(payment.proofFileName ?? "proof"),
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
    logger.error({ err: error }, "Payment proof download failed");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
