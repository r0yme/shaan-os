"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventTime, isInMonth, monthKey, shiftMonth, weekGrid } from "@/lib/calendar";
import {
  EventFormModal,
  toDatetimeLocal,
  type EventFormValue,
  type RefOption,
} from "@/components/calendar/event-form-modal";

export interface SerializedCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  projectId: string | null;
  clientId: string | null;
  projectName: string | null;
  createdById: string | null;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function CalendarView({
  events,
  month,
  projectOptions,
  clientOptions,
  currentUserId,
  canCreate,
  canDelete,
  canManageAny,
}: {
  events: SerializedCalendarEvent[];
  month: string;
  projectOptions: RefOption[];
  clientOptions: RefOption[];
  currentUserId: string;
  canCreate: boolean;
  canDelete: boolean;
  canManageAny: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [modal, setModal] = useState<{
    event: EventFormValue;
    createdById: string | null;
  } | null>(null);

  const weeks = useMemo(() => weekGrid(month), [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, SerializedCalendarEvent[]>();
    for (const event of events) {
      const key = localDateKey(new Date(event.startsAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.allDay === b.allDay ? 0 : a.allDay ? -1 : 1));
    }
    return map;
  }, [events]);

  function goTo(target: string) {
    router.push(`${pathname}?month=${target}`);
  }

  function openCreate(day: Date) {
    if (!canCreate) return;
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0);
    setModal({
      event: {
        id: "",
        title: "",
        description: null,
        location: null,
        startsAt: toDatetimeLocal(start),
        endsAt: toDatetimeLocal(addDays(start, 1)),
        allDay: false,
        projectId: null,
        clientId: null,
      },
      createdById: null,
    });
  }

  function openEdit(event: SerializedCalendarEvent) {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    setModal({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: toDatetimeLocal(start),
        endsAt: toDatetimeLocal(end),
        allDay: event.allDay,
        projectId: event.projectId,
        clientId: event.clientId,
      },
      createdById: event.createdById,
    });
  }

  const today = monthKey(new Date());

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => goTo(shiftMonth(month, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(shiftMonth(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => goTo(today)}>
            Today
          </Button>
          <h2 className="ml-2 text-lg font-semibold text-foreground">
            {new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(
              "en-US",
              { month: "long", year: "numeric" },
            )}
          </h2>
        </div>
        {canCreate && (
          <Button onClick={() => openCreate(new Date())}>
            <Plus className="h-4 w-4" />
            New event
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const key = localDateKey(day);
            const dayEvents = byDay.get(key) ?? [];
            const inMonth = isInMonth(month, day);
            const isToday = monthKey(day) === today && localDateKey(day) === localDateKey(new Date());
            const visible = dayEvents.slice(0, 3);
            const rest = dayEvents.length - visible.length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => openCreate(day)}
                className={cn(
                  "min-h-24 border-b border-r border-border p-1.5 text-left align-top last:border-r-0",
                  !inMonth && "bg-muted/30",
                  canCreate && "hover:bg-accent/40",
                )}
              >
                <div
                  className={cn(
                    "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {visible.map((event) => (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(event);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          openEdit(event);
                        }
                      }}
                      className="flex items-center gap-1 overflow-hidden rounded bg-primary/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-primary"
                    >
                      {event.projectName && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          title={event.projectName}
                        />
                      )}
                      <span className="truncate">{event.title}</span>
                      {!event.allDay && (
                        <span className="shrink-0 text-[10px] text-primary/70">
                          {formatEventTime(
                            new Date(event.startsAt),
                            new Date(event.endsAt),
                            false,
                          ).split(" – ")[0]}
                        </span>
                      )}
                    </div>
                  ))}
                  {rest > 0 && (
                    <p className="px-1 text-[11px] text-muted-foreground">+{rest} more</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <EventFormModal
        key={modal?.event.id ?? "create"}
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        event={modal?.event}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
        canDelete={
          Boolean(modal) &&
          canDelete &&
          (modal?.createdById === null || modal?.createdById === currentUserId || canManageAny)
        }
      />
    </>
  );
}
