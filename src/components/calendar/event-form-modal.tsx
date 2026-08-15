"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  createCalendarEventAction,
  deleteCalendarEventAction,
  updateCalendarEventAction,
} from "@/app/(portal)/calendar/actions";
import type { ActionResult } from "@/lib/action-result";

export interface EventFormValue {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  projectId: string | null;
  clientId: string | null;
}

export interface RefOption {
  id: string;
  name: string;
}

export function toDatetimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EventFormModal({
  open,
  onClose,
  event,
  projectOptions,
  clientOptions,
  canDelete,
}: {
  open: boolean;
  onClose: () => void;
  event?: EventFormValue | null;
  projectOptions: RefOption[];
  clientOptions: RefOption[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [startsAt, setStartsAt] = useState(event?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(event?.endsAt ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [projectId, setProjectId] = useState(event?.projectId ?? "");
  const [clientId, setClientId] = useState(event?.clientId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      title,
      description,
      location,
      startsAt,
      endsAt,
      allDay,
      projectId,
      clientId,
    };

    const result: ActionResult = event
      ? await updateCalendarEventAction(event.id, input)
      : await createCalendarEventAction(input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  async function onDelete() {
    if (!event) return;
    setError(null);
    setLoading(true);
    const result = await deleteCalendarEventAction(event.id);
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
      title={isEdit ? "Edit event" : "New event"}
      description={isEdit ? "Update the event's details." : "Schedule an event on the calendar."}
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
          <Label htmlFor="event-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="event-title"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kickoff call"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-start">
              Starts <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-start"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-end">
              Ends <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-end"
              type="datetime-local"
              required
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Office, link, or address"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-project">Project</Label>
            <Select
              id="event-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="No project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-client">Client</Label>
            <Select
              id="event-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="No client"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          All day
        </label>

        <div className="space-y-2">
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Agenda, attendees, or notes"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {isEdit && canDelete ? (
            <Button
              type="button"
              variant="destructive"
              loading={loading}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Save changes" : "Create event"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
