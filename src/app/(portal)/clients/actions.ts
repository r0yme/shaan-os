"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { parseWithZod, clientSchema } from "@/lib/validation";
import { AppError, NotFoundError, ConflictError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  if (isUniqueError(error)) {
    return { ok: false, error: "A client with this email already exists." };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createClientAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients.create");
    const data = parseWithZod(clientSchema, input);

    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        website: data.website,
        address: data.address,
        notes: data.notes,
        status: data.status,
        kind: data.kind,
        accountManagerId: user.id,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
      summary: `Client created: ${client.name}`,
    });
    revalidatePath("/clients");
    return { ok: true, id: client.id };
  } catch (error) {
    return errorResult(error, "createClient");
  }
}

export async function updateClientAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients.update");
    const data = parseWithZod(clientSchema, input);

    const existing = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError("Client not found.");

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        website: data.website,
        address: data.address,
        notes: data.notes,
        status: data.status,
        kind: data.kind,
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "Client",
      entityId: client.id,
      summary: `Client updated: ${client.name}`,
    });
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true, id: client.id };
  } catch (error) {
    return errorResult(error, "updateClient");
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("clients.delete");

    const existing = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Client not found.");

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAudit({
      actorId: user.id,
      action: "SOFT_DELETE",
      entity: "Client",
      entityId: id,
      summary: `Client deleted: ${existing.name}`,
    });
    revalidatePath("/clients");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteClient");
  }
}

export async function createClientFromLeadAction(leadId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("leads.convert");

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
    });
    if (!lead) throw new NotFoundError("Lead not found.");
    if (lead.clientId) {
      throw new ConflictError("This lead has already been converted to a client.");
    }

    const client = await prisma.client.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        notes: lead.notes,
        kind: "BUSINESS",
        accountManagerId: user.id,
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { clientId: client.id, status: "WON" },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
      summary: `Client created from lead: ${lead.name}`,
      metadata: { leadId: lead.id },
    });
    revalidatePath("/leads");
    revalidatePath("/clients");
    return { ok: true, id: client.id };
  } catch (error) {
    return errorResult(error, "createClientFromLead");
  }
}
