import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { ClientShell } from "@/components/layout/client-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.kind !== "CLIENT") redirect("/dashboard");

  return (
    <ClientShell user={{ name: user.name, email: user.email, image: user.image }}>
      {children}
    </ClientShell>
  );
}
