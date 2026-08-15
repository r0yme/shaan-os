import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground shadow-sm">
        S
      </span>
      <span className="text-[15px] text-foreground">Shaan OS</span>
    </Link>
  );
}
