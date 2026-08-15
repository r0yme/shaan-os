"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Download, Pencil, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  InvoiceFormModal,
  type InvoiceFormValue,
  type RefOption,
} from "@/components/billing/invoice-form-modal";
import { PaymentsModal, type SerializedPayment } from "@/components/billing/payments-modal";
import { sendInvoiceAction, voidInvoiceAction } from "@/app/(portal)/billing/actions";

export function InvoiceDetailActions({
  invoice,
  invoiceId,
  invoiceNumber,
  status,
  remainingCents,
  payments,
  clientOptions,
  projectOptions,
  canEdit,
  canSend,
  canVoid,
  canRecordPayment,
}: {
  invoice: InvoiceFormValue;
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  remainingCents: number;
  payments: SerializedPayment[];
  clientOptions: RefOption[];
  projectOptions: RefOption[];
  canEdit: boolean;
  canSend: boolean;
  canVoid: boolean;
  canRecordPayment: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "void" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    const result =
      confirm === "send" ? await sendInvoiceAction(invoiceId) : await voidInvoiceAction(invoiceId);
    setBusy(false);
    if (result.ok) {
      setConfirm(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/billing/${invoiceId}/pdf`}
          className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
        {canRecordPayment && status !== "PAID" && status !== "VOID" && (
          <Button onClick={() => setPaymentsOpen(true)}>
            <Banknote className="h-4 w-4" />
            Record payment
          </Button>
        )}
        {canEdit && status === "DRAFT" && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
        {canSend && status === "DRAFT" && (
          <Button variant="outline" onClick={() => setConfirm("send")}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        )}
        {canVoid && status !== "PAID" && status !== "VOID" && (
          <Button variant="destructive" onClick={() => setConfirm("void")}>
            <XCircle className="h-4 w-4" />
            Void
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <InvoiceFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        invoice={invoice}
        clientOptions={clientOptions}
        projectOptions={projectOptions}
      />

      <ConfirmDialog
        open={confirm === "send"}
        onClose={() => setConfirm(null)}
        title="Send invoice"
        description={`${invoiceNumber} will be marked as sent and included in outstanding balances.`}
        confirmLabel="Send"
        loading={busy}
        onConfirm={onConfirm}
      />

      <ConfirmDialog
        open={confirm === "void"}
        onClose={() => setConfirm(null)}
        title="Void invoice"
        description={`${invoiceNumber} will be voided and excluded from outstanding balances.`}
        confirmLabel="Void"
        loading={busy}
        onConfirm={onConfirm}
      />

      <PaymentsModal
        open={paymentsOpen}
        onClose={() => setPaymentsOpen(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        remainingCents={remainingCents}
        payments={payments}
        canRecord={canRecordPayment}
      />
    </>
  );
}
