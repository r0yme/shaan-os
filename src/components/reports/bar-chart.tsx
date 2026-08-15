import { barPercent } from "@/lib/reports";
import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  display: string;
  sublabel?: string;
}

export function VerticalBars({
  data,
  emptyLabel = "No data for this period.",
}: {
  data: BarDatum[];
  emptyLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);

  if (max <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        {data.map((datum) => (
          <div key={datum.label} className="flex flex-1 flex-col items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">{datum.display}</p>
            <div className="flex h-40 w-full max-w-12 items-end rounded-t-md bg-muted/50">
              <div
                className="w-full rounded-t-md bg-primary/80"
                style={{ height: `${barPercent(datum.value, max)}%` }}
                title={datum.sublabel ?? `${datum.label}: ${datum.display}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-2 sm:gap-3">
        {data.map((datum) => (
          <span key={datum.label} className="flex-1 truncate text-center text-[11px] text-muted-foreground">
            {datum.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({
  data,
  emptyLabel = "No data for this period.",
}: {
  data: BarDatum[];
  emptyLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);

  if (max <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((datum) => (
        <div key={datum.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">{datum.label}</span>
            <span className="shrink-0 text-sm text-muted-foreground">{datum.display}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn("h-full rounded-full bg-primary/80")}
              style={{ width: `${barPercent(datum.value, max)}%` }}
            />
          </div>
          {datum.sublabel && (
            <p className="mt-0.5 text-xs text-muted-foreground">{datum.sublabel}</p>
          )}
        </div>
      ))}
    </div>
  );
}
