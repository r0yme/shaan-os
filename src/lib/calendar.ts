export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

export function monthStart(key: string): Date {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 1);
}

export function monthEnd(key: string): Date {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

export function monthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  return monthKey(new Date(year, month + delta, 1));
}

export function isInMonth(key: string, date: Date): boolean {
  return monthKey(date) === key;
}

export function weekGrid(key: string): Date[][] {
  const start = monthStart(key);
  const offset = (start.getDay() + 6) % 7;
  const gridStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - offset);
  const end = monthEnd(key);
  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= end.getTime()) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatEventTime(startsAt: Date, endsAt: Date, allDay: boolean): string {
  if (allDay) return "All day";
  const time = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${time(startsAt)} – ${time(endsAt)}`;
}
