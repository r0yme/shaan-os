import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo href="/" />
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">404</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page does not exist or you do not have access to it.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
