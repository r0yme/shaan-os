import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  issueDate: Date | null;
  dueDate: Date | null;
  taxRateBps: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  currency: string;
  business: {
    name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
  };
  client: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
    amountCents: number;
  }>;
  payments: Array<{
    amountCents: number;
    method: string;
    paidAt: Date;
  }>;
}

const INK = rgb(0.16, 0.16, 0.19);
const MUTED = rgb(0.45, 0.47, 0.52);
const ACCENT = rgb(0.24, 0.34, 0.78);
const LINE = rgb(0.88, 0.89, 0.92);
const GREEN = rgb(0.15, 0.55, 0.3);

function formatMoney(cents: number, currency: string): string {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", BDT: "৳", INR: "₹" };
  const symbol = symbols[currency] ?? `${currency} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    CREDIT_CARD: "Credit card",
    OTHER: "Other",
  };
  return labels[method] ?? method;
}

function drawLine(doc: PDFDocument, pageY: number, width: number) {
  const page = doc.getPages()[0];
  page.drawLine({
    start: { x: 48, y: pageY },
    end: { x: 48 + width, y: pageY },
    thickness: 1,
    color: LINE,
  });
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter portrait
  const { width } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 736;

  // --- Header: business + invoice title ---
  page.drawText(data.business.name ?? "Shaan Studio", { x: 48, y, size: 20, font: bold, color: INK });
  y -= 14;
  const businessLines = [
    data.business.address,
    [data.business.email, data.business.phone].filter(Boolean).join("  ·  "),
    data.business.website,
  ].filter(Boolean) as string[];
  for (const line of businessLines.slice(0, 3)) {
    page.drawText(line, { x: 48, y, size: 9, font, color: MUTED });
    y -= 12;
  }

  page.drawText("INVOICE", { x: width - 48 - 130, y: 736, size: 24, font: bold, color: ACCENT });
  page.drawText(`#${data.invoiceNumber}`, { x: width - 48 - 130, y: 712, size: 13, font: bold, color: INK });
  page.drawText(`Status: ${data.status}`, { x: width - 48 - 130, y: 698, size: 9, font, color: MUTED });

  drawLine(doc, 664, width - 96);
  y = 640;

  // --- Billed to / meta ---
  page.drawText("BILLED TO", { x: 48, y, size: 9, font: bold, color: MUTED });
  y -= 13;
  page.drawText(data.client.name ?? "—", { x: 48, y, size: 12, font: bold, color: INK });
  y -= 14;
  const clientLines = [
    data.client.email,
    data.client.phone,
    data.client.address,
  ].filter(Boolean) as string[];
  for (const line of clientLines.slice(0, 3)) {
    page.drawText(line, { x: 48, y, size: 9, font, color: MUTED });
    y -= 12;
  }

  const metaX = width - 48 - 170;
  let metaY = 640;
  const metaRows: Array<[string, string]> = [
    ["Issue date", formatDate(data.issueDate)],
    ["Due date", formatDate(data.dueDate)],
    ["Currency", data.currency],
  ];
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: metaX, y: metaY, size: 9, font, color: MUTED });
    page.drawText(value, { x: metaX + 85, y: metaY, size: 9, font: bold, color: INK });
    metaY -= 16;
  }

  // --- Items table ---
  y = 566;
  page.drawText("Description", { x: 48, y, size: 9, font: bold, color: MUTED });
  page.drawText("Qty", { x: 380, y, size: 9, font: bold, color: MUTED });
  page.drawText("Unit price", { x: 430, y, size: 9, font: bold, color: MUTED });
  page.drawText("Amount", { x: width - 48 - 70, y, size: 9, font: bold, color: MUTED });
  drawLine(doc, y - 6, width - 96);
  y -= 22;

  for (const item of data.items) {
    page.drawText(item.description.slice(0, 90), { x: 48, y, size: 10, font, color: INK });
    page.drawText(String(item.quantity), { x: 380, y, size: 10, font, color: INK });
    page.drawText(formatMoney(item.unitPriceCents, data.currency), { x: 430, y, size: 10, font, color: INK });
    page.drawText(formatMoney(item.amountCents, data.currency), { x: width - 48 - 70, y, size: 10, font: bold, color: INK });
    y -= 18;
    if (y < 120) {
      drawLine(doc, y - 6, width - 96);
      break;
    }
  }

  drawLine(doc, y - 6, width - 96);
  y -= 24;

  // --- Totals ---
  const totalsX = width - 48 - 200;
  page.drawText("Subtotal", { x: totalsX, y, size: 10, font, color: MUTED });
  page.drawText(formatMoney(data.subtotalCents, data.currency), { x: width - 48 - 70, y, size: 10, font, color: INK });
  y -= 18;
  page.drawText(`Tax (${(data.taxRateBps / 100).toFixed(1)}%)`, { x: totalsX, y, size: 10, font, color: MUTED });
  page.drawText(formatMoney(data.taxCents, data.currency), { x: width - 48 - 70, y, size: 10, font, color: INK });
  y -= 18;
  drawLine(doc, y - 2, width - 96);
  y -= 20;
  page.drawText("Total", { x: totalsX, y, size: 12, font: bold, color: INK });
  page.drawText(formatMoney(data.totalCents, data.currency), { x: width - 48 - 70, y, size: 12, font: bold, color: INK });
  y -= 18;

  const paidCents = data.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceCents = Math.max(data.totalCents - paidCents, 0);
  if (paidCents > 0) {
    y -= 18;
    page.drawText("Paid", { x: totalsX, y, size: 10, font, color: MUTED });
    page.drawText(formatMoney(paidCents, data.currency), { x: width - 48 - 70, y, size: 10, font, color: GREEN });
  }
  y -= 18;
  page.drawText(balanceCents === 0 ? "Paid in full" : "Balance due", { x: totalsX, y, size: 10, font: bold, color: MUTED });
  page.drawText(formatMoney(balanceCents, data.currency), { x: width - 48 - 70, y, size: 10, font: bold, color: balanceCents === 0 ? GREEN : INK });

  y -= 28;
  if (data.payments.length > 0) {
    page.drawText("PAYMENTS", { x: 48, y, size: 9, font: bold, color: MUTED });
    y -= 14;
    for (const payment of data.payments.slice(0, 4)) {
      page.drawText(
        `${formatMoney(payment.amountCents, data.currency)}  ·  ${methodLabel(payment.method)}  ·  ${formatDate(payment.paidAt)}`,
        { x: 48, y, size: 9, font, color: INK },
      );
      y -= 13;
    }
    y -= 10;
  }

  if (data.notes) {
    page.drawText("NOTES", { x: 48, y, size: 9, font: bold, color: MUTED });
    y -= 14;
    const words = data.notes.split(/\s+/);
    let line = "";
    for (const word of words) {
      if ((line + " " + word).trim().length > 88) {
        page.drawText(line, { x: 48, y, size: 9, font, color: INK });
        line = word;
        y -= 12;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) {
      page.drawText(line, { x: 48, y, size: 9, font, color: INK });
    }
  }

  // --- Footer ---
  page.drawText(
    `Generated by Shaan OS · ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}`,
    { x: 48, y: 40, size: 8, font, color: MUTED },
  );

  return doc.save();
}
