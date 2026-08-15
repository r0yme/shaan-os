import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { AuditLogView, type SerializedAuditRow } from "@/components/audit/audit-log-view";
import { AuditAction } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Audit log" };

const ACTIONS = Object.values(AuditAction);

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; entity?: string }>;
}) {
  await guardPermission("audit.view");
  const { q, action, entity } = await searchParams;

  const where = {
    ...(action && ACTIONS.includes(action as AuditAction)
      ? { action: action as AuditAction }
      : {}),
    ...(entity ? { entity } : {}),
    ...(q?.trim()
      ? {
          OR: [
            { summary: { contains: q.trim(), mode: "insensitive" as const } },
            { entity: { contains: q.trim(), mode: "insensitive" as const } },
            { actor: { is: { name: { contains: q.trim(), mode: "insensitive" as const } } } },
            { actor: { is: { email: { contains: q.trim(), mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [logs, entityRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 201,
    }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
  ]);

  const truncated = logs.length > 200;
  const rows: SerializedAuditRow[] = logs.slice(0, 200).map((log) => ({
    id: log.id,
    action: log.action,
    actorName: log.actor?.name ?? log.actor?.email ?? null,
    actorType: log.actorType,
    entity: log.entity,
    summary: log.summary,
    ip: log.ip,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading
        title="Audit log"
        description="A chronological record of security-sensitive actions across the workspace."
      />
      <AuditLogView
        rows={rows}
        q={q ?? ""}
        action={action ?? ""}
        entity={entity ?? ""}
        actions={ACTIONS}
        entities={entityRows.map((row) => row.entity).filter(Boolean)}
        truncated={truncated}
      />
    </>
  );
}
