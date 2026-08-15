"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Radar,
  FolderKanban,
  ListTodo,
  ReceiptText,
  HardHat,
  ContactRound,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  icon: string;
  results: SearchResultItem[];
}

const GROUP_ICONS: Record<string, typeof Users> = {
  clients: Users,
  leads: Radar,
  projects: FolderKanban,
  tasks: ListTodo,
  invoices: ReceiptText,
  contractors: HardHat,
  employees: ContactRound,
  files: FolderOpen,
};

export function GlobalSearch({ q, groups }: { q: string; groups: SearchGroup[] }) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        Search your workspace
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Find clients, leads, projects, tasks, invoices, contractors, employees and files.
      </p>

      <form onSubmit={onSubmit} className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across your workspace…"
            className="h-11 pl-10 text-base"
            aria-label="Search"
          />
        </div>
        <Button type="submit" className="h-11">
          Search
        </Button>
      </form>

      {q === "" ? (
        <EmptyState
          icon={Search}
          title="Type to search"
          description="Enter a term above to search across your clients, projects, tasks and more."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No results for "${q}"`}
          description="Try a different keyword or check the spelling."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group.icon] ?? Users;
            return (
              <section key={group.key} aria-label={group.label}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {group.label}
                  <span className="font-normal text-muted-foreground/70">
                    {group.results.length}
                  </span>
                </h2>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  {group.results.map((result) => (
                    <li key={result.id}>
                      <Link
                        href={result.href}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {result.title}
                          </span>
                          {result.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
