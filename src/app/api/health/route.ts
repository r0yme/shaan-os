import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let databaseOk = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    databaseOk = false;
    checks.database = "error";
  }

  const healthy = databaseOk;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      app: "shaan-os",
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
