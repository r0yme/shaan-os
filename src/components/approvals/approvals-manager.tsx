"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ApprovalStatusBadge,
  ApprovalTypeBadge,
} from "@/components/approvals/status-badges";
import { cancelApprovalAction, decideApprovalAction } from "@/app/(portal)/approvals/actions";

export interface SerializedApproval {
  id: string;
  type: string;
  status: string;
  entityId: string;
  entityName: string;
  entityDetail: string | null;
  entityLink: string;
  requestorName: string | null;
  comment: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "INVOICE", label: "Invoice" },
  { value: "EXPENSE", label: "Expense" },
  { value: "MILESTONE", label: "Milestone" },
];

export function ApprovalsManager({
  approvals,
  statusFilter,
  typeFilter,
  pendingCount,
  approvedCount,
  rejectedCount,
  canManage,
}: {
  approvals: SerializedApproval[];
  statusFilter: string;
  typeFilter: string;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState(statusFilter);
  const [type, setType] = useState(typeFilter);
  const [deciding, setDeciding] = useState<SerializedApproval | null>(null);
  const [comment, setComment] = useState("");
  const [cancelling, setCancelling] = useState<SerializedApproval | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [status, type, pathname, router]);

  const summaryCards = [
    { label: "Pending", value: pendingCount, tone: "text-warning" },
    { label: "Approved", value: approvedCount, tone: "text-success" },
    { label: "Rejected", value: rejectedCount, tone: "text-muted-foreground" },
  ];

  async function submitDecision(decision: "APPROVED" | "REJECTED") {
    if (!deciding) return;
    setBusy(true);
    setError(null);
    const result = await decideApprovalAction({ id: deciding.id, decision, comment });
    setBusy(false);
    if (result.ok) {
      setDeciding(null);
      setComment("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function confirmCancel() {
    if (!cancelling) return;
    setBusy(true);
    const result = await cancelApprovalAction({ id: cancelling.id });
    setBusy(false);
    if (result.ok) {
      setCancelling(null);
      router.refresh();
    } else {
      setCancelling(null);
      setError(result.error);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {approvals.length} approval{approvals.length === 1 ? "" : "s"}
        </p>
        <div className="sm:w-44">
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="sm:w-44">
          <Select
            aria-label="Filter by type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={TYPE_OPTIONS}
          />
        </div>
      </div>

      <DataTable<SerializedApproval>
        columns={[
          {
            key: "type",
            header: "Type",
            cell: (approval) => <ApprovalTypeBadge type={approval.type} />,
          },
          {
            key: "entity",
            header: "Entity",
            cell: (approval) => (
              <div>
                <Link
                  href={approval.entityLink}
                  className="font-medium text-foreground hover:underline"
                >
                  {approval.entityName}
                </Link>
                {approval.entityDetail && (
                  <p className="text-xs text-muted-foreground">{approval.entityDetail}</p>
                )}
              </div>
            ),
          },
          {
            key: "requested",
            header: "Requested",
            cell: (approval) => (
              <div>
                <p className="text-foreground">{approval.requestorName ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(approval.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (approval) => <ApprovalStatusBadge status={approval.status} />,
          },
          {
            key: "decision",
            header: "Decision",
            cell: (approval) => {
              if (approval.status === "PENDING") {
                return approval.comment ? (
                  <span className="text-muted-foreground">{approval.comment}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                );
              }
              return (
                <div>
                  {approval.comment && <p className="text-muted-foreground">{approval.comment}</p>}
                  <p className="text-xs text-muted-foreground">
                    {approval.decidedByName ?? "—"}
                    {approval.decidedAt
                      ? ` · ${new Date(approval.decidedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                      : ""}
                  </p>
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "",
            className: "w-40",
            cell: (approval) => (
              <div className="flex items-center gap-2">
                {approval.status === "PENDING" && canManage && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setComment("");
                        setError(null);
                        setDeciding(approval);
                      }}
                    >
                      Decide
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCancelling(approval)}>
                      Cancel
                    </Button>
                  </>
                )}
                {approval.status !== "PENDING" && <span className="text-muted-foreground">—</span>}
              </div>
            ),
          },
        ]}
        data={approvals}
        keyExtractor={(approval) => approval.id}
        emptyIcon={ClipboardCheck}
        emptyTitle="No approvals found"
        emptyDescription="Pending approval requests will appear here."
      />

      <Modal
        open={Boolean(deciding)}
        onClose={() => {
          if (!busy) setDeciding(null);
        }}
        title="Decide approval"
        description={
          deciding
            ? `${deciding.type === "INVOICE" ? "Invoice" : deciding.type === "EXPENSE" ? "Expense" : "Milestone"} · ${deciding.entityName}`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setDeciding(null);
                setComment("");
              }}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => submitDecision("REJECTED")}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button loading={busy} onClick={() => submitDecision("APPROVED")}>
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="decision-comment">Comment</Label>
          <Textarea
            id="decision-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional note about this decision"
            disabled={busy}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="Cancel approval request"
        description={
          cancelling
            ? `${cancelling.type === "INVOICE" ? "Invoice" : cancelling.type === "EXPENSE" ? "Expense" : "Milestone"} · ${cancelling.entityName} will no longer require approval.`
            : undefined
        }
        confirmLabel="Cancel request"
        loading={busy}
        onConfirm={confirmCancel}
      />
    </>
  );
}
