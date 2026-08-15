import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { UserStatus, UserKind } from "@/generated/prisma/enums";

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  kind: (typeof UserKind)[keyof typeof UserKind];
  status: (typeof UserStatus)[keyof typeof UserStatus];
  roleKeys: string[];
  permissions: Set<string>;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });
  if (!user || user.deletedAt) return null;

  const roleKeys = user.roles.map((r) => r.role.key);
  const permissions = new Set<string>();
  for (const userRole of user.roles) {
    for (const rp of userRole.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    kind: user.kind,
    status: user.status,
    roleKeys,
    permissions,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (user.status !== "ACTIVE") throw new UnauthorizedError("Your account is not active.");
  return user;
}

export async function requirePermission(key: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.permissions.has(key)) {
    throw new ForbiddenError(`Missing required permission: ${key}`);
  }
  return user;
}

export async function requireRole(roleKey: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.roleKeys.includes(roleKey)) {
    throw new ForbiddenError(`You need the ${roleKey} role to access this.`);
  }
  return user;
}
