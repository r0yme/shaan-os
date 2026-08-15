"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const order = ["light", "system", "dark"] as const;
const icons = { light: Sun, system: Monitor, dark: Moon } as const;

function useIsMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  const current = mounted ? (theme as (typeof order)[number]) ?? "system" : "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  const Icon = icons[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      onClick={() => setTheme(next)}
    >
      <Icon className="h-[18px] w-[18px]" />
    </Button>
  );
}
