"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus, UserCheck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LeadFormModal, type LeadFormValue } from "@/components/leads/lead-form-modal";
import { LeadSourceLabel } from "@/components/clients/status-badges";
import {
  deleteLeadAction,
  setLeadStatusAction,
} from "@/app/(portal)/leads/actions";
import { createClientFromLeadAction } from "@/app/(portal)/clients/actions";

export interface SerializedLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number | null;
  source: string;
  status: string;
  notes: string | null;
  clientId: string | null;
  assigneeName: string | null;
}

const STATUS_ORDER = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export function LeadBoard({
  leads,
  canConvert,
}: {
  leads: SerializedLead[];
  canConvert: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<LeadFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedLead | null>(null);
  const [converting, setConverting] = useState<SerializedLead | null>(null);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, SerializedLead[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const lead of leads) {
      const bucket = map.get(lead.status) ?? map.get("NEW")!;
      bucket.push(lead);
    }
    return map;
  }, [leads]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteLeadAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  async function confirmConvert() {
    if (!converting) return;
    setBusy(true);
    const result = await createClientFromLeadAction(converting.id);
    setBusy(false);
    if (result.ok) {
      setConverting(null);
      router.push(`/clients/${result.id}`);
      router.refresh();
    }
  }

  async function moveStatus(leadId: string, status: string) {
    await setLeadStatusAction(leadId, status);
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leads.length} lead{leads.length === 1 ? "" : "s"} in the pipeline
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setModal("create");
          }}
        >
          <UserPlus className="h-4 w-4" />
          Add lead
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const column = grouped.get(status) ?? [];
          return (
            <section key={status} className="min-h-24">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      status === "WON"
                        ? "bg-success"
                        : status === "LOST"
                          ? "bg-destructive"
                          : status === "PROPOSAL" || status === "QUALIFIED"
                            ? "bg-warning"
                            : status === "CONTACTED"
                              ? "bg-primary"
                              : "bg-muted-foreground",
                    )}
                  />
                  <h3 className="text-sm font-semibold text-foreground">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span className="text-xs text-muted-foreground">{column.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {column.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Drop leads here
                  </div>
                )}
                {column.map((lead) => (
                  <Card key={lead.id} className="shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {lead.name}
                        </p>
                        <DropdownMenu
                          label={`Actions for ${lead.name}`}
                          trigger={<span className="font-semibold">···</span>}
                          items={[
                            {
                              label: "Edit",
                              icon: <Pencil className="h-4 w-4" />,
                              onSelect: () => {
                                setEditing({
                                  id: lead.id,
                                  name: lead.name,
                                  email: lead.email,
                                  phone: lead.phone,
                                  company: lead.company,
                                  source: lead.source,
                                  status: lead.status,
                                  value: lead.value,
                                  notes: lead.notes,
                                });
                                setModal("edit");
                              },
                            },
                            ...(canConvert
                              ? [
                                  {
                                    label: "Convert to client",
                                    icon: <PartyPopper className="h-4 w-4" />,
                                    disabled: Boolean(lead.clientId),
                                    onSelect: () => setConverting(lead),
                                  },
                                ]
                              : []),
                            {
                              label: "Delete",
                              destructive: true,
                              icon: <Trash2 className="h-4 w-4" />,
                              onSelect: () => setDeleting(lead),
                            },
                          ]}
                        />
                      </div>
                      {lead.company && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{lead.company}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Select
                          aria-label={`Status for ${lead.name}`}
                          value={lead.status}
                          onChange={(e) => moveStatus(lead.id, e.target.value)}
                          options={STATUS_OPTIONS}
                          className="h-7 max-w-28 text-xs"
                        />
                        {lead.value != null && (
                          <span className="text-xs font-semibold text-foreground">
                            ${(lead.value / 100).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <LeadSourceLabel source={lead.source} />
                        {lead.assigneeName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCheck className="h-3 w-3" />
                            {lead.assigneeName}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <LeadFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        lead={modal === "edit" ? editing : null}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete lead"
        description={
          deleting ? `"${deleting.name}" will be removed from the pipeline.` : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(converting)}
        onClose={() => setConverting(null)}
        title="Convert to client"
        description={
          converting
            ? `Create a client from "${converting.name}" and mark the lead as Won?`
            : undefined
        }
        confirmLabel="Convert"
        loading={busy}
        onConfirm={confirmConvert}
      />
    </>
  );
}
