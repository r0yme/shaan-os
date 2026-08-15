import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          {label}
          {Icon && <Icon className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-red-600 dark:text-red-400",
            tone === "default" && "text-foreground",
          )}
        >
          {value}
        </p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
