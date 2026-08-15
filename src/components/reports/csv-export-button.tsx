"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvExportButton({
  filename,
  columns,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  columns: string[];
  rows: unknown[][];
  label?: string;
}) {
  function download() {
    const escape = (value: unknown): string => {
      const text = value == null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [columns.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))]
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={download} disabled={rows.length === 0}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
