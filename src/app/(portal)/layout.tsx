import { redirect } from "next/navigation";
import { guardUser } from "@/lib/page-guard";
import { filterNavForUser } from "@/config/nav";
import { PortalShell } from "@/components/layout/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await guardUser();
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
