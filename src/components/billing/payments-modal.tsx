"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Banknote } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PaymentMethodBadge } from "@/components/billing/status-badges";
import { recordPaymentAction } from "@/app/(portal)/billing/actions";
import type { ActionResult } from "@/lib/action-result";

export interface SerializedPayment {
  id: string;
  amountCents: number;
  method: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  recordedByName: string | null;
}

const METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "OTHER", label: "Other" },
];

export function PaymentsModal({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
  remainingCents,
  payments,
  canRecord,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  remainingCents: number;
  payments: SerializedPayment[];
  canRecord: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRecord(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      amountCents: amount === "" ? "" : String(Math.round((Number(amount) || 0) * 100)),
      method,
      paidAt,
      reference,
      notes,
    };
    const result: ActionResult = await recordPaymentAction(invoiceId, input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAmount("");
    setReference("");
    setNotes("");
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Payments — ${invoiceNumber}`}
      description={`${formatCurrency(remainingCents / 100)} still outstanding.`}
      size="md"
    >
      <div className="space-y-4">
        {payments.length > 0 && (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(payment.amountCents / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString("en-US", { dateStyle: "medium" })
                        : "—"}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                </div>
                <PaymentMethodBadge method={payment.method} />
              </div>
            ))}
          </div>
        )}

        {canRecord && remainingCents > 0 ? (
          <form onSubmit={onRecord} className="space-y-4 border-t border-border pt-4">
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
                <Label htmlFor="payment-amount">
                  Amount (USD) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment-amount"
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
                <Label htmlFor="payment-method">Method</Label>
                <Select
                  id="payment-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  options={METHOD_OPTIONS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Paid on</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-ref">Reference</Label>
                <Input
                  id="payment-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Wire number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes</Label>
              <Input
                id="payment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                Record payment
              </Button>
            </div>
          </form>
        ) : (
          !canRecord && (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to record payments.
            </p>
          )
        )}
      </div>
    </Modal>
  );
}
