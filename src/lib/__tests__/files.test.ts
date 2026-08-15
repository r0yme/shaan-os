import { describe, expect, it } from "vitest";
import { contentDisposition, formatBytes } from "@/lib/files";
import { sanitizeFileName } from "@/lib/storage";

describe("formatBytes", () => {
  it("renders zero and invalid values", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });

  it("renders bytes without a decimal", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("renders kilobytes with one decimal", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("renders megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("renders gigabytes", () => {
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });
});

describe("contentDisposition", () => {
  it("builds an attachment header with a plain filename", () => {
    expect(contentDisposition("report.pdf")).toBe(
      'attachment; filename="report.pdf"; filename*=UTF-8\'\'report.pdf',
    );
  });

  it("falls back to ASCII for non-ascii names and keeps the RFC5987 value", () => {
    const value = contentDisposition("résumé.pdf");
    expect(value).toContain('filename="');
    expect(value).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.pdf");
  });

  it("strips quotes and backslashes from the fallback name", () => {
    const value = contentDisposition('a"b\\c.txt');
    expect(value).toContain('filename="a_b_c.txt"');
    expect(value).not.toContain("a\"b\\c");
  });
});

describe("sanitizeFileName", () => {
  it("keeps a normal name", () => {
    expect(sanitizeFileName("briefing.pdf")).toBe("briefing.pdf");
  });

  it("strips path separators", () => {
    expect(sanitizeFileName("..\\..\\etc\\passwd")).toBe("..-..-etc-passwd");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeFileName("  my   file  ")).toBe("my file");
  });

  it("falls back for an empty result", () => {
    expect(sanitizeFileName("   ")).toBe("file");
  });

  it("caps the length at 255 characters", () => {
    const long = `${"a".repeat(300)}.txt`;
    expect(sanitizeFileName(long).length).toBe(255);
  });
});
