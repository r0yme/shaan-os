"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

const RANGE_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export function RangePicker({ range }: { range: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      aria-label="Report date range"
      value={range}
      onChange={(e) => {
        const params = new URLSearchParams();
        params.set("range", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      options={RANGE_OPTIONS}
    />
  );
}
