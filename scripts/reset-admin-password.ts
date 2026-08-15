import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const ADMIN_EMAIL = "admin@example.com";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Configure it before running this script.");
  }

  const newPassword = process.env.ADMIN_RESET_PASSWORD ?? "Password123!";
  const passwordHash = await hashPassword(newPassword);

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        email: ADMIN_EMAIL,
        name: "Owner",
        kind: "USER",
        status: "ACTIVE",
        emailVerified: new Date(),
        passwordHash,
      },
      update: {
        status: "ACTIVE",
        passwordHash,
        lockedUntil: null,
        failedLoginCount: 0,
        tokenVersion: { increment: 1 },
        emailVerified: new Date(),
      },
    });

    const role = await prisma.role.findUnique({ where: { key: "OWNER" } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        create: { userId: user.id, roleId: role.id },
        update: {},
      });
    }

    console.log(`Admin (${ADMIN_EMAIL}) reset successfully.`);
    console.log(`Password: ${newPassword}`);
    console.log("Lock cleared and all sessions invalidated (tokenVersion bumped).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to reset admin password:", error);
  process.exit(1);
});
