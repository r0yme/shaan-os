"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Banknote, Download, Paperclip, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaymentMethodBadge } from "@/components/billing/status-badges";
import { recordBillingPaymentAction } from "@/app/(portal)/billing/actions";
import type { ActionResult } from "@/lib/action-result";

export interface SerializedPaymentRow {
  id: string;
  amountCents: number;
  method: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  proofFileName: string | null;
  clientName: string | null;
  invoiceNumber: string | null;
  projectName: string | null;
  taskTitle: string | null;
  recordedByName: string | null;
}

interface Option {
  value: string;
  label: string;
}

const METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "OTHER", label: "Other" },
];

function dateOnly(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function linkedLabel(payment: SerializedPaymentRow): string {
  if (payment.invoiceNumber) return `Invoice ${payment.invoiceNumber}`;
  if (payment.projectName) return payment.projectName;
  if (payment.taskTitle) return payment.taskTitle;
  return "—";
}

export function PaymentsView({
  payments,
  totalCents,
  canRecord,
  invoiceOptions,
  projectOptions,
  taskOptions,
}: {
  payments: SerializedPaymentRow[];
  totalCents: number;
  canRecord: boolean;
  invoiceOptions: Option[];
  projectOptions: Option[];
  taskOptions: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("amountCents", String(Math.round((Number(amount) || 0) * 100)));
    formData.set("method", method);
    if (paidAt) formData.set("paidAt", paidAt);
    if (reference) formData.set("reference", reference);
    if (notes) formData.set("notes", notes);
    if (invoiceId) formData.set("invoiceId", invoiceId);
    if (projectId) formData.set("projectId", projectId);
    if (taskId) formData.set("taskId", taskId);
    if (proof) formData.set("proof", proof);

    const result: ActionResult = await recordBillingPaymentAction(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAmount("");
    setPaidAt("");
    setReference("");
    setNotes("");
    setInvoiceId("");
    setProjectId("");
    setTaskId("");
    setProof(null);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Card className="w-full sm:w-auto">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">{formatCurrency(totalCents / 100)}</p>
          </CardContent>
        </Card>
        {canRecord && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Record payment
          </Button>
        )}
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5"
        >
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="bp-amount">
                Amount (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bp-amount"
                type="number"
                min={0.01}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-method">Method</Label>
              <Select
                id="bp-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                options={METHOD_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-date">Paid on</Label>
              <Input
                id="bp-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-proof">Proof</Label>
              <Input
                id="bp-proof"
                type="file"
                accept="image/*,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="bp-invoice">Invoice</Label>
              <Select
                id="bp-invoice"
                value={invoiceId}
                onChange={(e) => {
                  setInvoiceId(e.target.value);
                  if (e.target.value) {
                    setProjectId("");
                    setTaskId("");
                  }
                }}
                options={invoiceOptions}
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-project">Project</Label>
              <Select
                id="bp-project"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (e.target.value) {
                    setInvoiceId("");
                    setTaskId("");
                  }
                }}
                options={projectOptions}
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-task">Task</Label>
              <Select
                id="bp-task"
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value);
                  if (e.target.value) {
                    setInvoiceId("");
                    setProjectId("");
                  }
                }}
                options={taskOptions}
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-ref">Reference</Label>
              <Input
                id="bp-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ID"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bp-notes">Notes</Label>
            <Textarea
              id="bp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {proof && (
              <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{proof.name}</span>
              </p>
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Record payment
              </Button>
            </div>
          </div>
        </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payment history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<SerializedPaymentRow>
            columns={[
              {
                key: "amount",
                header: "Amount",
                cell: (payment) => (
                  <span className="font-medium text-foreground">
                    {formatCurrency(payment.amountCents / 100)}
                  </span>
                ),
              },
              {
                key: "client",
                header: "Client",
                cell: (payment) => (
                  <span className="text-muted-foreground">{payment.clientName ?? "—"}</span>
                ),
              },
              {
                key: "linked",
                header: "Linked to",
                cell: (payment) => (
                  <span className="text-muted-foreground">{linkedLabel(payment)}</span>
                ),
              },
              {
                key: "method",
                header: "Method",
                cell: (payment) => <PaymentMethodBadge method={payment.method} />,
              },
              {
                key: "paid",
                header: "Paid on",
                cell: (payment) => (
                  <span className="text-muted-foreground">{dateOnly(payment.paidAt)}</span>
                ),
              },
              {
                key: "reference",
                header: "Reference",
                cell: (payment) => (
                  <span className="text-muted-foreground">{payment.reference ?? "—"}</span>
                ),
              },
              {
                key: "recorded",
                header: "Recorded by",
                cell: (payment) => (
                  <span className="text-muted-foreground">{payment.recordedByName ?? "—"}</span>
                ),
              },
              {
                key: "proof",
                header: "Proof",
                cell: (payment) =>
                  payment.proofFileName ? (
                    <a
                      href={`/api/payments/${payment.id}/proof`}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
                        "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Proof
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
            ]}
            data={payments}
            keyExtractor={(payment) => payment.id}
            emptyIcon={Banknote}
            emptyTitle="No payments yet"
            emptyDescription="Payments recorded against invoices, projects or tasks will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
