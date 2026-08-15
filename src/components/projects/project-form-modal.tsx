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
import { createProjectAction, updateProjectAction } from "@/app/(portal)/projects/actions";
import type { ActionResult } from "@/lib/action-result";

export interface ProjectFormValue {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  clientId: string | null;
  managerId: string | null;
  budget: number | null;
  startDate: string | null;
  deadline: string | null;
  notes: string | null;
}

export interface RefOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export function ProjectFormModal({
  open,
  onClose,
  project,
  onSaved,
  clientOptions,
  managerOptions,
}: {
  open: boolean;
  onClose: () => void;
  project?: ProjectFormValue | null;
  onSaved?: (id: string) => void;
  clientOptions: RefOption[];
  managerOptions: RefOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "PLANNING");
  const [priority, setPriority] = useState(project?.priority ?? "MEDIUM");
  const [clientId, setClientId] = useState(project?.clientId ?? "");
  const [managerId, setManagerId] = useState(project?.managerId ?? "");
  const [budget, setBudget] = useState(project?.budget != null ? String(project.budget) : "");
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const input = {
      name,
      description,
      status,
      priority,
      clientId,
      managerId,
      budget,
      startDate,
      deadline,
      notes,
    };
    const result: ActionResult = project
      ? await updateProjectAction(project.id, input)
      : await createProjectAction(input);
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
      title={isEdit ? "Edit project" : "Add project"}
      description={isEdit ? "Update the project's details." : "Create a new project record."}
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
          <Label htmlFor="project-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="project-name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Website Redesign"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="project-status">Status</Label>
            <Select
              id="project-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-priority">Priority</Label>
            <Select
              id="project-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-client">Client</Label>
            <Select
              id="project-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="No client"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-manager">Project manager</Label>
            <Select
              id="project-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              options={managerOptions.map((m) => ({ value: m.id, label: m.name }))}
              placeholder="Unassigned"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-budget">Budget (cents)</Label>
            <Input
              id="project-budget"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="1000000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-start">Start date</Label>
            <Input
              id="project-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-deadline">Deadline</Label>
            <Input
              id="project-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-notes">Notes</Label>
          <Textarea
            id="project-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this project…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
