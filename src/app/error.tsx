"use client";

import { logger } from "@/lib/logger";
import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  logger.error({ err: error }, "Unhandled application error");
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh items-center justify-center bg-background px-4">
          <ErrorState
            title="Something went wrong"
            description={
              error.digest
                ? `Reference: ${error.digest}. Please try again.`
                : "An unexpected error occurred. Please try again."
            }
            onRetry={reset}
          />
        </div>
      </body>
    </html>
  );
}
