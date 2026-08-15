"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExpenseCategoryBadge } from "@/components/billing/status-badges";
import { ApprovalStatusBadge } from "@/components/approvals/status-badges";
import {
  ExpenseFormModal,
  type ExpenseFormValue,
  type RefOption,
} from "@/components/billing/expense-form-modal";
import { deleteExpenseAction } from "@/app/(portal)/billing/expenses/actions";
import { requestApprovalAction } from "@/app/(portal)/approvals/actions";

export interface SerializedExpense {
  id: string;
  amountCents: number;
  category: string;
  merchant: string | null;
  description: string | null;
  incurredAt: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string | null;
  clientName: string | null;
  recordedByName: string | null;
  approvalStatus: string | null;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "SOFTWARE", label: "Software" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "SERVICES", label: "Services" },
  { value: "TRAVEL", label: "Travel" },
  { value: "MEALS", label: "Meals" },
  { value: "OFFICE", label: "Office" },
  { value: "OTHER", label: "Other" },
];

function toFormValue(expense: SerializedExpense): ExpenseFormValue {
  return {
    id: expense.id,
    amountDollars: String(expense.amountCents / 100),
    category: expense.category,
    merchant: expense.merchant,
    description: expense.description,
    incurredAt: expense.incurredAt ? expense.incurredAt.slice(0, 10) : null,
    projectId: expense.projectId,
    clientId: expense.clientId,
  };
}

export function ExpensesManager({
  expenses,
  categoryFilter,
  monthCents,
  yearCents,
  allTimeCents,
  count,
  projectOptions,
  clientOptions,
  canCreate,
  canEdit,
  canDelete,
  canRequestApproval,
}: {
  expenses: SerializedExpense[];
  categoryFilter: string;
  monthCents: number;
  yearCents: number;
  allTimeCents: number;
  count: number;
  projectOptions: RefOption[];
  clientOptions: RefOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRequestApproval: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filter, setFilter] = useState(categoryFilter);
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<ExpenseFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedExpense | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filter) params.set("category", filter);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter, pathname, router]);

  const summaryCards = [
    { label: "This month", value: monthCents, tone: "text-warning" },
    { label: "This year", value: yearCents, tone: "text-foreground" },
    { label: "All time", value: allTimeCents, tone: "text-muted-foreground" },
  ];

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteExpenseAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  async function requestApproval(expense: SerializedExpense) {
    setBusy(true);
    setError(null);
    const result = await requestApprovalAction({ type: "EXPENSE", entityId: expense.id });
    setBusy(false);
    if (result.ok) {
      router.refresh();
    } else {
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
            {count} expense{count === 1 ? "" : "s"}
          </p>
          <div className="sm:w-44">
            <Select
              aria-label="Filter by category"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={CATEGORY_OPTIONS}
            />
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditing(null);
              setModal("create");
            }}
          >
            <Plus className="h-4 w-4" />
            Record expense
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DataTable<SerializedExpense>
        columns={[
          {
            key: "description",
            header: "Description",
            cell: (expense) => (
              <div>
                <p className="font-medium text-foreground">
                  {expense.description ?? expense.merchant ?? "Expense"}
                </p>
                {expense.merchant && (
                  <p className="text-xs text-muted-foreground">{expense.merchant}</p>
                )}
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            cell: (expense) => <ExpenseCategoryBadge category={expense.category} />,
          },
          {
            key: "date",
            header: "Date",
            cell: (expense) => (
              <span className="text-muted-foreground">
                {expense.incurredAt
                  ? new Date(expense.incurredAt).toLocaleDateString("en-US", { dateStyle: "medium" })
                  : "—"}
              </span>
            ),
          },
          {
            key: "project",
            header: "Project",
            cell: (expense) => (
              <span className="text-muted-foreground">{expense.projectName ?? "—"}</span>
            ),
          },
          {
            key: "by",
            header: "Recorded by",
            cell: (expense) => (
              <span className="text-muted-foreground">{expense.recordedByName ?? "—"}</span>
            ),
          },
          {
            key: "approval",
            header: "Approval",
            cell: (expense) =>
              expense.approvalStatus ? (
                <ApprovalStatusBadge status={expense.approvalStatus} />
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: "amount",
            header: "Amount",
            className: "text-right",
            cell: (expense) => (
              <span className="font-medium text-foreground">
                {formatCurrency(expense.amountCents / 100)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (expense) => (
              <DropdownMenu
                label={`Actions for expense`}
                trigger={<span className="font-semibold">···</span>}
                items={[
                  ...(canRequestApproval && !expense.approvalStatus
                    ? [
                        {
                          label: "Request approval",
                          icon: <BadgeCheck className="h-4 w-4" />,
                          onSelect: () => requestApproval(expense),
                        },
                      ]
                    : []),
                  ...(canEdit
                    ? [
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => {
                            setEditing(toFormValue(expense));
                            setModal("edit");
                          },
                        },
                      ]
                    : []),
                  ...(canDelete
                    ? [
                        {
                          label: "Delete",
                          destructive: true,
                          icon: <Trash2 className="h-4 w-4" />,
                          onSelect: () => setDeleting(expense),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
        data={expenses}
        keyExtractor={(expense) => expense.id}
        emptyIcon={ReceiptText}
        emptyTitle="No expenses found"
        emptyDescription="Record your first business expense to get started."
      />

      <ExpenseFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        expense={modal === "edit" ? editing : null}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete expense"
        description={
          deleting
            ? `This ${formatCurrency(deleting.amountCents / 100)} expense will be removed.`
            : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
