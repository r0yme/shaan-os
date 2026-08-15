"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MilestoneStatusBadge } from "@/components/projects/status-badges";
import {
  MilestoneFormModal,
  type MilestoneFormValue,
} from "@/components/projects/milestone-form-modal";
import { deleteMilestoneAction } from "@/app/(portal)/projects/actions";
import { formatDate } from "@/lib/utils";

export interface SerializedMilestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

function dateOnly(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function toFormValue(milestone: SerializedMilestone): MilestoneFormValue {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    dueDate: milestone.dueDate ? milestone.dueDate.slice(0, 10) : null,
  };
}

export function MilestonesPanel({
  projectId,
  milestones,
  canManage,
}: {
  projectId: string;
  milestones: SerializedMilestone[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"none" | "create" | "edit" | "delete">("none");
  const [editing, setEditing] = useState<MilestoneFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedMilestone | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingLoading(true);
    const result = await deleteMilestoneAction(deleting.id);
    setDeletingLoading(false);
    if (result.ok) {
      setModal("none");
      setDeleting(null);
      router.refresh();
    }
  }

  const columns = [
    {
      key: "title",
      header: "Milestone",
      cell: (m: SerializedMilestone) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{m.title}</p>
          {m.description && (
            <p className="truncate text-xs text-muted-foreground">{m.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (m: SerializedMilestone) => <MilestoneStatusBadge status={m.status} />,
    },
    {
      key: "due",
      header: "Due date",
      cell: (m: SerializedMilestone) => (
        <span className="text-muted-foreground">{dateOnly(m.dueDate)}</span>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (m: SerializedMilestone) => (
        <span className="text-muted-foreground">{formatDate(m.createdAt)}</span>
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (m: SerializedMilestone) => (
              <DropdownMenu
                label={`Actions for ${m.title}`}
                trigger={<span className="font-semibold">···</span>}
                items={[
                  {
                    label: "Edit",
                    icon: <Pencil className="h-4 w-4" />,
                    onSelect: () => {
                      setEditing(toFormValue(m));
                      setModal("edit");
                    },
                  },
                  {
                    label: "Delete",
                    destructive: true,
                    icon: <Trash2 className="h-4 w-4" />,
                    onSelect: () => {
                      setDeleting(m);
                      setModal("delete");
                    },
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <Flag className="h-5 w-5 text-muted-foreground" />
          Milestones
        </h2>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setModal("create");
            }}
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={milestones}
        keyExtractor={(m) => m.id}
        emptyIcon={Flag}
        emptyTitle="No milestones"
        emptyDescription="Break the project into milestones to track delivery."
      />

      <MilestoneFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        projectId={projectId}
        milestone={modal === "edit" ? editing : null}
      />

      <ConfirmDialog
        open={modal === "delete"}
        onClose={() => setModal("none")}
        title="Delete milestone"
        description={
          deleting
            ? `"${deleting.title}" will be removed from the project.`
            : undefined
        }
        loading={deletingLoading}
        onConfirm={confirmDelete}
      />
    </>
  );
}
