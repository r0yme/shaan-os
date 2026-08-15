"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ProjectStatusBadge,
  ProjectPriorityBadge,
} from "@/components/projects/status-badges";
import {
  ProjectFormModal,
  type ProjectFormValue,
  type RefOption,
} from "@/components/projects/project-form-modal";
import { deleteProjectAction } from "@/app/(portal)/projects/actions";
import { formatDate } from "@/lib/utils";

export interface SerializedProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  clientId: string | null;
  clientName: string | null;
  managerId: string | null;
  managerName: string | null;
  budget: number | null;
  startDate: string | null;
  deadline: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function dateOnly(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function toFormValue(project: SerializedProject): ProjectFormValue {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    clientId: project.clientId,
    managerId: project.managerId,
    budget: project.budget,
    startDate: project.startDate ? project.startDate.slice(0, 10) : null,
    deadline: project.deadline ? project.deadline.slice(0, 10) : null,
    notes: project.notes,
  };
}

export function ProjectsManager({
  projects,
  q,
  status,
  clientOptions,
  managerOptions,
}: {
  projects: SerializedProject[];
  q: string;
  status: string;
  clientOptions: RefOption[];
  managerOptions: RefOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(q);
  const [statusFilter, setStatusFilter] = useState(status);
  const [modal, setModal] = useState<"none" | "create" | "edit" | "delete">("none");
  const [editing, setEditing] = useState<ProjectFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedProject | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, pathname, router]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Project",
        cell: (project: SerializedProject) => (
          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}`}
              className="block truncate font-medium text-foreground hover:underline"
            >
              {project.name}
            </Link>
            {project.clientName && (
              <p className="truncate text-xs text-muted-foreground">{project.clientName}</p>
            )}
          </div>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        cell: (project: SerializedProject) => (
          <ProjectPriorityBadge priority={project.priority} />
        ),
      },
      {
        key: "manager",
        header: "Manager",
        cell: (project: SerializedProject) => (
          <span className="text-muted-foreground">{project.managerName ?? "Unassigned"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (project: SerializedProject) => (
          <ProjectStatusBadge status={project.status} />
        ),
      },
      {
        key: "budget",
        header: "Budget",
        cell: (project: SerializedProject) => (
          <span className="text-foreground">
            {project.budget != null ? `$${(project.budget / 100).toLocaleString()}` : "—"}
          </span>
        ),
      },
      {
        key: "deadline",
        header: "Deadline",
        cell: (project: SerializedProject) => (
          <span className="text-muted-foreground">{dateOnly(project.deadline)}</span>
        ),
      },
      {
        key: "created",
        header: "Created",
        cell: (project: SerializedProject) => (
          <span className="text-muted-foreground">{formatDate(project.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-10",
        cell: (project: SerializedProject) => (
          <DropdownMenu
            label={`Actions for ${project.name}`}
            trigger={<span className="font-semibold">···</span>}
            items={[
              {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onSelect: () => router.push(`/projects/${project.id}`),
              },
              {
                label: "Edit",
                icon: <Pencil className="h-4 w-4" />,
                onSelect: () => {
                  setEditing(toFormValue(project));
                  setModal("edit");
                },
              },
              {
                label: "Delete",
                destructive: true,
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => {
                  setDeleting(project);
                  setModal("delete");
                },
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingLoading(true);
    const result = await deleteProjectAction(deleting.id);
    setDeletingLoading(false);
    if (result.ok) {
      setModal("none");
      setDeleting(null);
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="sm:max-w-xs"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search projects"
        />
        <div className="sm:w-48">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="sm:ml-auto">
          <Button
            onClick={() => {
              setEditing(null);
              setModal("create");
            }}
          >
            <Plus className="h-4 w-4" />
            Add project
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        keyExtractor={(p) => p.id}
        emptyIcon={FolderKanban}
        emptyTitle={q || statusFilter ? "No projects match your filters" : "No projects yet"}
        emptyDescription={
          q || statusFilter
            ? "Try adjusting the search or status filter."
            : "Add your first project to get started."
        }
      />

      <ProjectFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        project={modal === "edit" ? editing : null}
        clientOptions={clientOptions}
        managerOptions={managerOptions}
      />

      <ConfirmDialog
        open={modal === "delete"}
        onClose={() => setModal("none")}
        title="Delete project"
        description={
          deleting
            ? `"${deleting.name}" will be removed from the workspace. This can be restored by an administrator.`
            : undefined
        }
        loading={deletingLoading}
        onConfirm={confirmDelete}
      />
    </>
  );
}
