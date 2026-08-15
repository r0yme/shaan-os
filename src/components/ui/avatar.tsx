import { cn } from "@/lib/utils";

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  image,
  className,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? "Avatar"}
        className={cn("h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
