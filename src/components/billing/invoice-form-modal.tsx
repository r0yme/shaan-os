"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createInvoiceAction, updateInvoiceAction } from "@/app/(portal)/billing/actions";
import type { ActionResult } from "@/lib/action-result";

export interface InvoiceItemValue {
  description: string;
  quantity: string;
  unitPriceDollars: string;
}

export interface InvoiceFormValue {
  id: string;
  clientId: string | null;
  projectId: string | null;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  taxPercent: string;
  notes: string | null;
  items: InvoiceItemValue[];
}

export interface RefOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
];

function computeTotalsPreview(items: InvoiceItemValue[], taxPercent: string) {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPriceDollars) || 0),
    0,
  );
  const rate = Number(taxPercent) || 0;
  const tax = subtotal * (rate / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function InvoiceFormModal({
  open,
  onClose,
  invoice,
  clientOptions,
  projectOptions,
}: {
  open: boolean;
  onClose: () => void;
  invoice?: InvoiceFormValue | null;
  clientOptions: RefOption[];
  projectOptions: RefOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(invoice);

  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [projectId, setProjectId] = useState(invoice?.projectId ?? "");
  const [status, setStatus] = useState(invoice?.status ?? "DRAFT");
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [taxPercent, setTaxPercent] = useState(invoice?.taxPercent ?? "0");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [items, setItems] = useState<InvoiceItemValue[]>(
    invoice?.items?.length
      ? invoice.items
      : [{ description: "", quantity: "1", unitPriceDollars: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totals = computeTotalsPreview(items, taxPercent);

  function updateItem(index: number, field: keyof InvoiceItemValue, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: "1", unitPriceDollars: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      clientId,
      projectId,
      status,
      issueDate,
      dueDate,
      taxRateBps:
        taxPercent === "" ? "" : String(Math.round((Number(taxPercent) || 0) * 100)),
      notes,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceCents:
          item.unitPriceDollars === ""
            ? ""
            : String(Math.round((Number(item.unitPriceDollars) || 0) * 100)),
      })),
    };

    const result: ActionResult = invoice
      ? await updateInvoiceAction(invoice.id, input)
      : await createInvoiceAction(input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit invoice" : "New invoice"}
      description={isEdit ? "Update the invoice's details." : "Create a new invoice."}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoice-client">Client</Label>
            <Select
              id="invoice-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="No client"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-project">Project</Label>
            <Select
              id="invoice-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="No project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-status">Status</Label>
            <Select
              id="invoice-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-tax">Tax rate (%)</Label>
            <Input
              id="invoice-tax"
              type="number"
              min={0}
              max={100}
              step="any"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-issued">Issue date</Label>
            <Input
              id="invoice-issued"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-due">Due date</Label>
            <Input
              id="invoice-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" />
              Add item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label className="sr-only" htmlFor={`invoice-item-${index}-desc`}>
                    Description
                  </Label>
                  <Input
                    id={`invoice-item-${index}-desc`}
                    required
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </div>
                <div className="w-20 space-y-2">
                  <Label className="sr-only" htmlFor={`invoice-item-${index}-qty`}>
                    Quantity
                  </Label>
                  <Input
                    id={`invoice-item-${index}-qty`}
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label className="sr-only" htmlFor={`invoice-item-${index}-price`}>
                    Unit price
                  </Label>
                  <Input
                    id={`invoice-item-${index}-price`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPriceDollars}
                    onChange={(e) => updateItem(index, "unitPriceDollars", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="ml-auto max-w-56 space-y-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice-notes">Notes</Label>
          <Textarea
            id="invoice-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, instructions, etc."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Create invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
