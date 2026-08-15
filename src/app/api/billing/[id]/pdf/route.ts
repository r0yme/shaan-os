import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { contentDisposition } from "@/lib/files";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const user = await requirePermission("invoices.view");

    const where: { id: string; deletedAt: null } = { id, deletedAt: null };
    if (user.kind === "CLIENT") {
      const profile = await prisma.client.findFirst({
        where: { portalUserId: user.id, deletedAt: null },
        select: { id: true },
      });
      if (!profile) throw new ForbiddenError("You can only download your own invoices.");
      where.id = id;
      const own = await prisma.invoice.findFirst({
        where: { id, clientId: profile.id, deletedAt: null },
        select: { id: true },
      });
      if (!own) throw new ForbiddenError("You can only download your own invoices.");
    }

    const invoice = await prisma.invoice.findFirst({
      where,
      include: {
        client: { select: { name: true, email: true, phone: true, address: true } },
        items: true,
        payments: { orderBy: { paidAt: "asc" } },
      },
    });
    if (!invoice) throw new NotFoundError("Invoice not found.");

    const business = await prisma.businessProfile.findUnique({ where: { id: "default" } });

    const bytes = await buildInvoicePdf({
      invoiceNumber: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      taxRateBps: invoice.taxRateBps,
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      notes: invoice.notes,
      currency: business?.currency ?? "USD",
      business: {
        name: business?.name ?? null,
        email: business?.email ?? null,
        phone: business?.phone ?? null,
        website: business?.website ?? null,
        address: business?.address ?? null,
      },
      client: {
        name: invoice.client?.name ?? null,
        email: invoice.client?.email ?? null,
        phone: invoice.client?.phone ?? null,
        address: invoice.client?.address ?? null,
      },
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        amountCents: item.amountCents,
      })),
      payments: invoice.payments.map((payment) => ({
        amountCents: payment.amountCents,
        method: payment.method,
        paidAt: payment.paidAt,
      })),
    });

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.length),
        "Content-Disposition": contentDisposition(`${invoice.number}.pdf`),
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
    logger.error({ err: error }, "Invoice PDF generation failed");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
