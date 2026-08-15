import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { filterNavForUser } from "@/config/nav";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.kind === "CLIENT") redirect("/c");

  const items = filterNavForUser(user);

  return (
    <PortalShell
      items={items}
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        roleKeys: user.roleKeys,
      }}
    >
      {children}
    </PortalShell>
  );
}
