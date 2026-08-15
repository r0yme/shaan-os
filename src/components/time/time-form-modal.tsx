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
import { hoursToMinutes } from "@/lib/time";
import { logTimeAction, updateTimeAction } from "@/app/(portal)/time/actions";
import type { ActionResult } from "@/lib/action-result";

export interface TimeFormValue {
  id: string;
  date: string;
  hours: string;
  taskId: string | null;
  note: string | null;
}

export interface TaskOption {
  id: string;
  name: string;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TimeFormModal({
  open,
  onClose,
  entry,
  taskOptions,
}: {
  open: boolean;
  onClose: () => void;
  entry?: TimeFormValue | null;
  taskOptions: TaskOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(entry);

  const [date, setDate] = useState(entry?.date ?? toLocalDateString(new Date()));
  const [hours, setHours] = useState(entry?.hours ?? "");
  const [taskId, setTaskId] = useState(entry?.taskId ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      date,
      minutes: hoursToMinutes(Number(hours) || 0),
      taskId,
      note,
    };

    const result: ActionResult = entry
      ? await updateTimeAction(entry.id, input)
      : await logTimeAction(input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit time entry" : "Log time"}
      description={isEdit ? "Update the time entry's details." : "Record time spent on work."}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="time-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="time-date"
              type="date"
              required
              autoFocus
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-hours">
              Hours <span className="text-destructive">*</span>
            </Label>
            <Input
              id="time-hours"
              type="number"
              min={0.25}
              max={24}
              step="0.25"
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="1.5"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="time-task">Task</Label>
            <Select
              id="time-task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              options={taskOptions.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="No task"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time-note">Note</Label>
          <Textarea
            id="time-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you work on?"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Log time"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
