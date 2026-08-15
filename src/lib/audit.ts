import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AuditAction } from "@/generated/prisma/enums";

export type AuditActorType = "user" | "client" | "system";

export interface AuditEntry {
  actorId?: string | null;
  actorType?: AuditActorType;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an audit log entry. Audit writes must never break the primary
 * business flow, so failures are logged and swallowed.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorType: entry.actorType ?? "user",
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        metadata: (entry.metadata as object) ?? undefined,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to write audit log");
  }
}
