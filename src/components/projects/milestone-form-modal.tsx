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
import { createMilestoneAction, updateMilestoneAction } from "@/app/(portal)/projects/actions";
import type { ActionResult } from "@/lib/action-result";

export interface MilestoneFormValue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
];

export function MilestoneFormModal({
  open,
  onClose,
  projectId,
  milestone,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  milestone?: MilestoneFormValue | null;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(milestone);

  const [title, setTitle] = useState(milestone?.title ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [status, setStatus] = useState(milestone?.status ?? "PENDING");
  const [dueDate, setDueDate] = useState(milestone?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const input = { title, description, status, dueDate };
    const result: ActionResult = milestone
      ? await updateMilestoneAction(milestone.id, input)
      : await createMilestoneAction(projectId, input);
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
      title={isEdit ? "Edit milestone" : "Add milestone"}
      description={isEdit ? "Update the milestone's details." : "Create a new milestone."}
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

        <div className="space-y-2">
          <Label htmlFor="milestone-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="milestone-title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Design phase"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="milestone-description">Description</Label>
          <Textarea
            id="milestone-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this milestone cover?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="milestone-status">Status</Label>
            <Select
              id="milestone-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="milestone-due">Due date</Label>
            <Input
              id="milestone-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add milestone"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
