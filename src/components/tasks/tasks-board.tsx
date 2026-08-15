"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, FolderKanban, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskFormModal, type TaskFormValue, type RefOption } from "@/components/tasks/task-form-modal";
import { TaskPriorityBadge } from "@/components/tasks/status-badges";
import { deleteTaskAction, setTaskStatusAction } from "@/app/(portal)/tasks/actions";

export interface SerializedTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  projectName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  createdAt: string;
}

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const STATUS_LABELS: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-muted-foreground",
  IN_PROGRESS: "bg-primary",
  IN_REVIEW: "bg-warning",
  DONE: "bg-success",
};

function dateOnly(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function toFormValue(task: SerializedTask): TaskFormValue {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
    estimatedHours: task.estimatedHours,
  };
}

export function TasksBoard({
  tasks,
  projectFilter,
  projectOptions,
  assigneeOptions,
  canCreate,
  canEdit,
  canAssign,
  canDelete,
}: {
  tasks: SerializedTask[];
  projectFilter: string;
  projectOptions: RefOption[];
  assigneeOptions: RefOption[];
  canCreate: boolean;
  canEdit: boolean;
  canAssign: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filter, setFilter] = useState(projectFilter);
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<TaskFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedTask | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filter) params.set("project", filter);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter, pathname, router]);

  const grouped = useMemo(() => {
    const map = new Map<string, SerializedTask[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const task of tasks) {
      const bucket = map.get(task.status) ?? map.get("TODO")!;
      bucket.push(task);
    }
    return map;
  }, [tasks]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteTaskAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  async function moveStatus(taskId: string, status: string) {
    await setTaskStatusAction(taskId, status);
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </p>
          <div className="sm:w-56">
            <Select
              aria-label="Filter by project"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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
            Add task
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const column = grouped.get(status) ?? [];
          return (
            <section key={status} className="min-h-24">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
                  <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
                  <span className="text-xs text-muted-foreground">{column.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {column.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
                {column.map((task) => (
                  <Card key={task.id} className="shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {task.title}
                        </p>
                        <DropdownMenu
                          label={`Actions for ${task.title}`}
                          trigger={<span className="font-semibold">···</span>}
                          items={[
                            ...(canEdit
                              ? [
                                  {
                                    label: "Edit",
                                    icon: <Pencil className="h-4 w-4" />,
                                    onSelect: () => {
                                      setEditing(toFormValue(task));
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
                                    onSelect: () => setDeleting(task),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                      {task.projectName && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <FolderKanban className="h-3 w-3" />
                          {task.projectName}
                        </p>
                      )}
                      {task.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <TaskPriorityBadge priority={task.priority} />
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {dateOnly(task.dueDate)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {canEdit ? (
                          <Select
                            aria-label={`Status for ${task.title}`}
                            value={task.status}
                            onChange={(e) => moveStatus(task.id, e.target.value)}
                            options={STATUS_OPTIONS}
                            className="h-7 max-w-32 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{STATUS_LABELS[task.status]}</span>
                        )}
                        {task.assigneeName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCheck className="h-3 w-3" />
                            {task.assigneeName}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <TaskFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        task={modal === "edit" ? editing : null}
        projectOptions={projectOptions}
        assigneeOptions={assigneeOptions}
        canAssign={canAssign}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete task"
        description={deleting ? `"${deleting.title}" will be removed from the board.` : undefined}
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
