import { redirect } from "next/navigation";
import { guardUser } from "@/lib/page-guard";
import { ClientShell } from "@/components/layout/client-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await guardUser();
  if (user.kind !== "CLIENT") redirect("/dashboard");

  return (
    <ClientShell user={{ name: user.name, email: user.email, image: user.image }}>
      {children}
    </ClientShell>
  );
}
