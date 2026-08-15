"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function BillingTabs({
  active,
}: {
  active: "invoices" | "expenses" | "payments";
}) {
  const tabs = [
    { key: "invoices" as const, href: "/billing", label: "Invoices" },
    { key: "payments" as const, href: "/billing/payments", label: "Payments" },
    { key: "expenses" as const, href: "/billing/expenses", label: "Expenses" },
  ];

  return (
    <div className="mb-6 inline-flex rounded-lg border border-border bg-muted/40 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
