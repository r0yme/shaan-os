"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HardHat, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { ContractorStatusBadge } from "@/components/contractors/status-badges";
import {
  ContractorFormModal,
  type ContractorFormValue,
  type ProjectOption,
} from "@/components/contractors/contractor-form-modal";
import { deleteContractorAction } from "@/app/(portal)/contractors/actions";

export interface SerializedContractor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  specialty: string | null;
  rate: number | null;
  status: string;
  notes: string | null;
  projectNames: string[];
  projectIds: string[];
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function toFormValue(contractor: SerializedContractor): ContractorFormValue {
  return {
    id: contractor.id,
    name: contractor.name,
    email: contractor.email,
    phone: contractor.phone,
    company: contractor.company,
    specialty: contractor.specialty,
    rate: contractor.rate,
    status: contractor.status,
    notes: contractor.notes,
    projectIds: contractor.projectIds,
  };
}

export function ContractorsManager({
  contractors,
  statusFilter,
  projectFilter,
  projectOptions,
  canCreate,
  canEdit,
  canDelete,
}: {
  contractors: SerializedContractor[];
  statusFilter: string;
  projectFilter: string;
  projectOptions: ProjectOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState(statusFilter);
  const [project, setProject] = useState(projectFilter);
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<ContractorFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedContractor | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (project) params.set("project", project);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [status, project, pathname, router]);

  const activeCount = contractors.filter((c) => c.status === "ACTIVE").length;
  const inactiveCount = contractors.length - activeCount;
  const activeRates = contractors
    .filter((c) => c.status === "ACTIVE" && c.rate != null)
    .map((c) => c.rate as number);
  const avgRate =
    activeRates.length > 0
      ? activeRates.reduce((sum, rate) => sum + rate, 0) / activeRates.length
      : null;

  const summaryCards = [
    { label: "Active contractors", value: String(activeCount), tone: "text-foreground" },
    { label: "Inactive", value: String(inactiveCount), tone: "text-muted-foreground" },
    {
      label: "Avg. active rate / hr",
      value: avgRate != null ? `${formatCurrency(avgRate / 100)}/hr` : "—",
      tone: "text-warning",
    },
  ];

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteContractorAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
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

      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            {contractors.length} contractor{contractors.length === 1 ? "" : "s"}
          </p>
          <div className="sm:w-44">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="sm:w-56">
            <Select
              aria-label="Filter by project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="All projects"
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
            Add contractor
          </Button>
        )}
      </div>

      <DataTable<SerializedContractor>
        columns={[
          {
            key: "name",
            header: "Contractor",
            cell: (contractor) => (
              <div className="flex items-center gap-3">
                <Avatar name={contractor.name} className="h-8 w-8 text-xs" />
                <div>
                  <p className="font-medium text-foreground">{contractor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {contractor.company ?? contractor.email ?? "—"}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: "specialty",
            header: "Specialty",
            cell: (contractor) => (
              <span className="text-muted-foreground">{contractor.specialty ?? "—"}</span>
            ),
          },
          {
            key: "projects",
            header: "Projects",
            cell: (contractor) => (
              <span className="text-muted-foreground">
                {contractor.projectNames.length === 0
                  ? "—"
                  : contractor.projectNames
                      .slice(0, 2)
                      .concat(
                        contractor.projectNames.length > 2
                          ? [`+${contractor.projectNames.length - 2} more`]
                          : [],
                      )
                      .join(", ")}
              </span>
            ),
          },
          {
            key: "rate",
            header: "Rate",
            className: "text-right",
            cell: (contractor) => (
              <span className="font-medium text-foreground">
                {contractor.rate != null ? `${formatCurrency(contractor.rate / 100)}/hr` : "—"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (contractor) => <ContractorStatusBadge status={contractor.status} />,
          },
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (contractor) => (
              <DropdownMenu
                label={`Actions for ${contractor.name}`}
                trigger={<span className="font-semibold">···</span>}
                items={[
                  ...(canEdit
                    ? [
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => {
                            setEditing(toFormValue(contractor));
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
                          onSelect: () => setDeleting(contractor),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
        data={contractors}
        keyExtractor={(contractor) => contractor.id}
        emptyIcon={HardHat}
        emptyTitle="No contractors found"
        emptyDescription="Add external specialists and assign them to projects."
      />

      <ContractorFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        contractor={modal === "edit" ? editing : null}
        projectOptions={projectOptions}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete contractor"
        description={
          deleting
            ? `${deleting.name} will be removed from the roster and all project assignments.`
            : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
