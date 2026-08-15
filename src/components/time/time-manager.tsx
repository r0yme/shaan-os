"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatMinutes } from "@/lib/time";
import { TimeFormModal, type TimeFormValue, type TaskOption } from "@/components/time/time-form-modal";
import { deleteTimeAction } from "@/app/(portal)/time/actions";

export interface SerializedTimeEntry {
  id: string;
  userId: string;
  taskId: string | null;
  minutes: number;
  date: string;
  note: string | null;
  userName: string | null;
  taskName: string | null;
  projectName: string | null;
  createdAt: string;
}

export interface UserOption {
  id: string;
  name: string;
}

function toFormValue(entry: SerializedTimeEntry): TimeFormValue {
  return {
    id: entry.id,
    date: entry.date.slice(0, 10),
    hours: String(entry.minutes / 60),
    taskId: entry.taskId,
    note: entry.note,
  };
}

export function TimeManager({
  entries,
  userFilter,
  taskFilter,
  weekMinutes,
  monthMinutes,
  allTimeMinutes,
  userOptions,
  taskOptions,
  currentUserId,
  canCreate,
  canManageAny,
}: {
  entries: SerializedTimeEntry[];
  userFilter: string;
  taskFilter: string;
  weekMinutes: number;
  monthMinutes: number;
  allTimeMinutes: number;
  userOptions: UserOption[];
  taskOptions: TaskOption[];
  currentUserId: string;
  canCreate: boolean;
  canManageAny: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(userFilter);
  const [task, setTask] = useState(taskFilter);
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<TimeFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedTimeEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (user) params.set("user", user);
      if (task) params.set("task", task);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [user, task, pathname, router]);

  const summaryCards = [
    { label: "This week", value: weekMinutes, tone: "text-warning" },
    { label: "This month", value: monthMinutes, tone: "text-foreground" },
    { label: "All time", value: allTimeMinutes, tone: "text-muted-foreground" },
  ];

  function canActOn(entry: SerializedTimeEntry): boolean {
    return entry.userId === currentUserId || canManageAny;
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteTimeAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    } else {
      setDeleting(null);
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
                {formatMinutes(card.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            {entries.length} time entr{entries.length === 1 ? "y" : "ies"}
          </p>
          <div className="sm:w-48">
            <Select
              aria-label="Filter by team member"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              options={userOptions.map((u) => ({ value: u.id, label: u.name }))}
              placeholder="All team members"
            />
          </div>
          <div className="sm:w-56">
            <Select
              aria-label="Filter by task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              options={taskOptions.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="All tasks"
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
            Log time
          </Button>
        )}
      </div>

      <DataTable<SerializedTimeEntry>
        columns={[
          {
            key: "date",
            header: "Date",
            cell: (entry) => (
              <span className="font-medium text-foreground">
                {new Date(entry.date).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
            ),
          },
          {
            key: "user",
            header: "Team member",
            cell: (entry) => (
              <span className="text-foreground">{entry.userName ?? "—"}</span>
            ),
          },
          {
            key: "task",
            header: "Task",
            cell: (entry) => (
              <div>
                <p className="text-foreground">{entry.taskName ?? "—"}</p>
                {entry.projectName && (
                  <p className="text-xs text-muted-foreground">{entry.projectName}</p>
                )}
              </div>
            ),
          },
          {
            key: "note",
            header: "Note",
            cell: (entry) => (
              <span className="text-muted-foreground">{entry.note ?? "—"}</span>
            ),
          },
          {
            key: "hours",
            header: "Hours",
            className: "text-right",
            cell: (entry) => (
              <span className="font-medium text-foreground">{formatMinutes(entry.minutes)}</span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (entry) => (
              <DropdownMenu
                label={`Actions for time entry`}
                trigger={<span className="font-semibold">···</span>}
                items={[
                  ...(canActOn(entry)
                    ? [
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => {
                            setEditing(toFormValue(entry));
                            setModal("edit");
                          },
                        },
                        {
                          label: "Delete",
                          destructive: true,
                          icon: <Trash2 className="h-4 w-4" />,
                          onSelect: () => setDeleting(entry),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
        data={entries}
        keyExtractor={(entry) => entry.id}
        emptyIcon={Clock}
        emptyTitle="No time entries found"
        emptyDescription="Log your first time entry to get started."
      />

      <TimeFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        entry={modal === "edit" ? editing : null}
        taskOptions={taskOptions}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete time entry"
        description={
          deleting
            ? `This ${formatMinutes(deleting.minutes)} entry will be removed.`
            : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
