"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createExpenseAction, updateExpenseAction } from "@/app/(portal)/billing/expenses/actions";
import type { ActionResult } from "@/lib/action-result";

export interface ExpenseFormValue {
  id: string;
  amountDollars: string;
  category: string;
  merchant: string | null;
  description: string | null;
  incurredAt: string | null;
  projectId: string | null;
  clientId: string | null;
}

export interface RefOption {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS = [
  { value: "SOFTWARE", label: "Software" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "SERVICES", label: "Services" },
  { value: "TRAVEL", label: "Travel" },
  { value: "MEALS", label: "Meals" },
  { value: "OFFICE", label: "Office" },
  { value: "OTHER", label: "Other" },
];

export function ExpenseFormModal({
  open,
  onClose,
  expense,
  projectOptions,
  clientOptions,
}: {
  open: boolean;
  onClose: () => void;
  expense?: ExpenseFormValue | null;
  projectOptions: RefOption[];
  clientOptions: RefOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(expense);

  const [amountDollars, setAmountDollars] = useState(expense?.amountDollars ?? "");
  const [category, setCategory] = useState(expense?.category ?? "OTHER");
  const [merchant, setMerchant] = useState(expense?.merchant ?? "");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [incurredAt, setIncurredAt] = useState(expense?.incurredAt ?? "");
  const [projectId, setProjectId] = useState(expense?.projectId ?? "");
  const [clientId, setClientId] = useState(expense?.clientId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      amountCents:
        amountDollars === "" ? "" : String(Math.round((Number(amountDollars) || 0) * 100)),
      category,
      merchant,
      description,
      incurredAt,
      projectId,
      clientId,
    };

    const result: ActionResult = expense
      ? await updateExpenseAction(expense.id, input)
      : await createExpenseAction(input);
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
      title={isEdit ? "Edit expense" : "Record expense"}
      description={isEdit ? "Update the expense's details." : "Log a new business expense."}
      size="md"
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
            <Label htmlFor="expense-amount">
              Amount (USD) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="expense-amount"
              type="number"
              min={0.01}
              step="0.01"
              required
              autoFocus
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <Select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORY_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-merchant">Merchant</Label>
            <Input
              id="expense-merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Vendor or store"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-date">Date incurred</Label>
            <Input
              id="expense-date"
              type="date"
              value={incurredAt}
              onChange={(e) => setIncurredAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-project">Project</Label>
            <Select
              id="expense-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="No project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-client">Client</Label>
            <Select
              id="expense-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="No client"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-description">Description</Label>
          <Textarea
            id="expense-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Record expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
