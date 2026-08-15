"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { AuditAction } from "@/generated/prisma/enums";

export interface SerializedAuditRow {
  id: string;
  action: AuditAction;
  actorName: string | null;
  actorType: string;
  entity: string;
  summary: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_TONES: Partial<Record<AuditAction, BadgeTone>> = {
  LOGIN: "primary",
  LOGIN_FAILED: "destructive",
  PASSWORD_CHANGE: "warning",
  PASSWORD_RESET: "warning",
  ROLE_CHANGE: "warning",
  PERMISSION_CHANGE: "warning",
  CREATE: "primary",
  DELETE: "destructive",
  SOFT_DELETE: "destructive",
  RESTORE: "success",
  APPROVE: "success",
  REJECT: "destructive",
  STATUS_CHANGE: "warning",
  SETTINGS_CHANGE: "warning",
  EXPORT: "outline",
};

function actionLabel(action: string): string {
  return action.replace(/_/g, " ").toLowerCase();
}

function actorLabel(row: SerializedAuditRow): string {
  if (row.actorType === "system") return "System";
  if (row.actorType === "client") return "Client";
  return row.actorName ?? "Unknown user";
}

export function AuditLogView({
  rows,
  q,
  action,
  entity,
  actions,
  entities,
  truncated,
}: {
  rows: SerializedAuditRow[];
  q: string;
  action: string;
  entity: string;
  actions: string[];
  entities: string[];
  truncated: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  function apply(next: { q?: string; action?: string; entity?: string }) {
    const params = new URLSearchParams();
    const nq = next.q ?? query;
    const na = next.action ?? action;
    const ne = next.entity ?? entity;
    if (nq.trim()) params.set("q", nq.trim());
    if (na) params.set("action", na);
    if (ne) params.set("entity", ne);
    const qs = params.toString();
    router.push(qs ? `/audit?${qs}` : "/audit");
  }

  const columns: Column<SerializedAuditRow>[] = [
    {
      key: "time",
      header: "Time",
      cell: (row) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <Badge tone={ACTION_TONES[row.action] ?? "default"}>{actionLabel(row.action)}</Badge>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      cell: (row) => (
        <span className="font-medium text-foreground">{actorLabel(row)}</span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      cell: (row) => (
        <Badge tone="outline" className="font-normal">
          {row.entity}
        </Badge>
      ),
    },
    {
      key: "summary",
      header: "Summary",
      cell: (row) => <span className="text-muted-foreground">{row.summary ?? "—"}</span>,
    },
    {
      key: "ip",
      header: "IP",
      cell: (row) => (
        <span className="whitespace-nowrap text-muted-foreground">{row.ip ?? "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search audit log"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply({});
            }}
            placeholder="Search summary, entity or actor…"
          />
        </div>
        <Select
          aria-label="Filter by action"
          value={action}
          onChange={(e) => apply({ action: e.target.value })}
          options={[
            { value: "", label: "All actions" },
            ...actions.map((value) => ({ value, label: actionLabel(value) })),
          ]}
          className="w-48"
        />
        <Select
          aria-label="Filter by entity"
          value={entity}
          onChange={(e) => apply({ entity: e.target.value })}
          options={[
            { value: "", label: "All entities" },
            ...entities.map((value) => ({ value, label: value })),
          ]}
          className="w-44"
        />
        {(q || action || entity) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              router.push("/audit");
            }}
            className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
          >
            Clear
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.id}
        emptyTitle="No audit events found"
        emptyDescription={
          q || action || entity
            ? "Try adjusting the filters."
            : "Security-sensitive actions are recorded here as they happen."
        }
        emptyIcon={History}
      />

      {truncated && (
        <p className="text-center text-xs text-muted-foreground">
          Showing the most recent 200 events. Narrow the filters to see older entries.
        </p>
      )}
    </div>
  );
}
