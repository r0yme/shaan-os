"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Banknote, Eye, Pencil, Plus, ReceiptText, Send, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InvoiceStatusBadge } from "@/components/billing/status-badges";
import {
  InvoiceFormModal,
  type InvoiceFormValue,
  type RefOption,
} from "@/components/billing/invoice-form-modal";
import { PaymentsModal, type SerializedPayment } from "@/components/billing/payments-modal";
import {
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/app/(portal)/billing/actions";

export interface SerializedInvoiceItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface SerializedInvoice {
  id: string;
  number: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  taxRateBps: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  items: SerializedInvoiceItem[];
  payments: SerializedPayment[];
}

export function BillingManager({
  invoices,
  statusFilter,
  clientOptions,
  projectOptions,
  canCreate,
  canEdit,
  canSend,
  canVoid,
  canRecordPayment,
}: {
  invoices: SerializedInvoice[];
  statusFilter: string;
  clientOptions: RefOption[];
  projectOptions: RefOption[];
  canCreate: boolean;
  canEdit: boolean;
  canSend: boolean;
  canVoid: boolean;
  canRecordPayment: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filter, setFilter] = useState(statusFilter);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceFormValue | null>(null);
  const [sending, setSending] = useState<SerializedInvoice | null>(null);
  const [voiding, setVoiding] = useState<SerializedInvoice | null>(null);
  const [paymentsInvoice, setPaymentsInvoice] = useState<SerializedInvoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter, pathname, router]);

  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.total += invoice.totalCents;
      if (invoice.status === "SENT") acc.outstanding += invoice.totalCents;
      if (invoice.status === "PAID") acc.paid += invoice.totalCents;
      if (invoice.status === "DRAFT") acc.draft += invoice.totalCents;
      return acc;
    },
    { total: 0, outstanding: 0, paid: 0, draft: 0 },
  );

  const summaryCards = [
    { label: "Outstanding", value: totals.outstanding, tone: "text-warning" },
    { label: "Paid", value: totals.paid, tone: "text-success" },
    { label: "Drafts", value: totals.draft, tone: "text-muted-foreground" },
  ];

  const STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "PAID", label: "Paid" },
    { value: "VOID", label: "Void" },
  ];

  function toFormValue(invoice: SerializedInvoice): InvoiceFormValue {
    return {
      id: invoice.id,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      status: invoice.status === "DRAFT" ? "DRAFT" : "SENT",
      issueDate: invoice.issueDate ? invoice.issueDate.slice(0, 10) : null,
      dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : null,
      taxPercent: String(invoice.taxRateBps / 100),
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPriceDollars: String(item.unitPriceCents / 100),
      })),
    };
  }

  function paidCents(invoice: SerializedInvoice): number {
    return invoice.payments.reduce((sum, p) => sum + p.amountCents, 0);
  }

  function remainingCents(invoice: SerializedInvoice): number {
    return Math.max(invoice.totalCents - paidCents(invoice), 0);
  }

  async function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setActionError(null);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      router.refresh();
      return true;
    }
    setActionError(result.error ?? "Something went wrong.");
    return false;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={`mt-1 text-xl font-semibold ${card.tone}`}>
                {formatCurrency(card.value / 100)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </p>
          <div className="sm:w-44">
            <Select
              aria-label="Filter by status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        )}
      </div>

      {actionError && <p className="mb-3 text-sm text-destructive">{actionError}</p>}

      <DataTable<SerializedInvoice>
        columns={[
          {
            key: "number",
            header: "Invoice",
            cell: (invoice) => (
              <span className="font-medium text-foreground">{invoice.number}</span>
            ),
          },
          {
            key: "client",
            header: "Client",
            cell: (invoice) => (
              <span className="text-muted-foreground">{invoice.clientName ?? "—"}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
          },
          {
            key: "issued",
            header: "Issued",
            cell: (invoice) => (
              <span className="text-muted-foreground">
                {invoice.issueDate
                  ? new Date(invoice.issueDate).toLocaleDateString("en-US", { dateStyle: "medium" })
                  : "—"}
              </span>
            ),
          },
          {
            key: "total",
            header: "Total",
            className: "text-right",
            cell: (invoice) => (
              <span className="font-medium text-foreground">
                {formatCurrency(invoice.totalCents / 100)}
              </span>
            ),
          },
          {
            key: "balance",
            header: "Balance",
            className: "text-right",
            cell: (invoice) => (
              <span className="text-muted-foreground">
                {formatCurrency(remainingCents(invoice) / 100)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (invoice) => (
              <DropdownMenu
                label={`Actions for ${invoice.number}`}
                trigger={<span className="font-semibold">···</span>}
                items={[
                  {
                    label: "View details",
                    icon: <Eye className="h-4 w-4" />,
                    onSelect: () => router.push(`/billing/${invoice.id}`),
                  },
                  ...(canEdit && invoice.status === "DRAFT"
                    ? [
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => {
                            setEditing(toFormValue(invoice));
                            setFormOpen(true);
                          },
                        },
                      ]
                    : []),
                  ...(canSend && invoice.status === "DRAFT"
                    ? [
                        {
                          label: "Send to client",
                          icon: <Send className="h-4 w-4" />,
                          onSelect: () => setSending(invoice),
                        },
                      ]
                    : []),
                  ...(canVoid && invoice.status !== "PAID" && invoice.status !== "VOID"
                    ? [
                        {
                          label: "Void invoice",
                          destructive: true,
                          icon: <XCircle className="h-4 w-4" />,
                          onSelect: () => setVoiding(invoice),
                        },
                      ]
                    : []),
                  ...(canRecordPayment &&
                  invoice.status !== "VOID" &&
                  invoice.status !== "PAID"
                    ? [
                        {
                          label: "Record payment",
                          icon: <Banknote className="h-4 w-4" />,
                          onSelect: () => setPaymentsInvoice(invoice),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
        data={invoices}
        keyExtractor={(invoice) => invoice.id}
        emptyIcon={ReceiptText}
        emptyTitle="No invoices found"
        emptyDescription="Create your first invoice to get started."
      />

      <InvoiceFormModal
        key={formOpen ? editing?.id ?? "create" : "closed"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        invoice={editing}
        clientOptions={clientOptions}
        projectOptions={projectOptions}
      />

      <ConfirmDialog
        open={Boolean(sending)}
        onClose={() => setSending(null)}
        title="Send invoice"
        description={
          sending
            ? `${sending.number} will be marked as sent and included in outstanding balances.`
            : undefined
        }
        confirmLabel="Send"
        loading={busy}
        onConfirm={() => {
          if (sending) runAction(() => sendInvoiceAction(sending.id));
          setSending(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        title="Void invoice"
        description={
          voiding
            ? `${voiding.number} will be voided and excluded from outstanding balances.`
            : undefined
        }
        confirmLabel="Void"
        loading={busy}
        onConfirm={() => {
          if (voiding) runAction(() => voidInvoiceAction(voiding.id));
          setVoiding(null);
        }}
      />

      <PaymentsModal
        open={Boolean(paymentsInvoice)}
        onClose={() => setPaymentsInvoice(null)}
        invoiceId={paymentsInvoice?.id ?? ""}
        invoiceNumber={paymentsInvoice?.number ?? ""}
        remainingCents={paymentsInvoice ? remainingCents(paymentsInvoice) : 0}
        payments={paymentsInvoice?.payments ?? []}
        canRecord={canRecordPayment}
      />
    </>
  );
}
