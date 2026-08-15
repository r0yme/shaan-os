export interface MonthBucket {
  key: string;
  label: string;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export function buildMonthSeries(start: Date, end: Date, maxBuckets = 24): MonthBucket[] {
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const buckets: MonthBucket[] = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth && buckets.length < maxBuckets) {
    const key = monthKey(cursor);
    buckets.push({ key, label: monthLabel(key) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

export function sumByMonth(
  records: Array<{ date: Date; amount: number }>,
  buckets: MonthBucket[],
): number[] {
  const totals = new Map<string, number>();
  for (const record of records) {
    const key = monthKey(record.date);
    totals.set(key, (totals.get(key) ?? 0) + record.amount);
  }
  return buckets.map((bucket) => totals.get(bucket.key) ?? 0);
}

export type ReportRange = "30" | "90" | "365" | "all";

const VALID_RANGES: string[] = ["30", "90", "365", "all"];

export function sinceForRange(range: string | undefined, now = new Date()): Date | null {
  if (!range || range === "all" || !VALID_RANGES.includes(range)) return null;
  const days = Number(range);
  const since = new Date(now);
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return since;
}

export function barPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function toCsv(columns: string[], rows: unknown[][]): string {
  const escape = (value: unknown): string => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}
