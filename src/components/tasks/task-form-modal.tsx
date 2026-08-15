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
import { createTaskAction, updateTaskAction } from "@/app/(portal)/tasks/actions";
import type { ActionResult } from "@/lib/action-result";

export interface TaskFormValue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
}

export interface RefOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export function TaskFormModal({
  open,
  onClose,
  task,
  onSaved,
  projectOptions,
  assigneeOptions,
  canAssign,
}: {
  open: boolean;
  onClose: () => void;
  task?: TaskFormValue | null;
  onSaved?: (id: string) => void;
  projectOptions: RefOption[];
  assigneeOptions: RefOption[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "TODO");
  const [priority, setPriority] = useState(task?.priority ?? "MEDIUM");
  const [projectId, setProjectId] = useState(task?.projectId ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [estimatedHours, setEstimatedHours] = useState(
    task?.estimatedHours != null ? String(task.estimatedHours) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const input = {
      title,
      description,
      status,
      priority,
      projectId,
      assigneeId,
      dueDate,
      estimatedHours,
    };
    const result: ActionResult = task
      ? await updateTaskAction(task.id, input)
      : await createTaskAction(input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved?.(result.id);
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit task" : "Add task"}
      description={isEdit ? "Update the task's details." : "Create a new task."}
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

        <div className="space-y-2">
          <Label htmlFor="task-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="task-title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Homepage hero section"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to be done?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-status">Status</Label>
            <Select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <Select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-project">Project</Label>
            <Select
              id="task-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="No project"
            />
          </div>
          {canAssign && (
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                options={assigneeOptions.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Unassigned"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-hours">Estimated hours</Label>
            <Input
              id="task-hours"
              type="number"
              min={1}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="8"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
