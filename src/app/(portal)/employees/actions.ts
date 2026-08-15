"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { hashPassword } from "@/lib/password";
import {
  parseWithZod,
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/lib/validation";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { UserKind, UserStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const FORBIDDEN_ROLE = "CLIENT";

async function validateRoles(roleKeys: string[]): Promise<void> {
  if (roleKeys.includes(FORBIDDEN_ROLE)) {
    throw new ConflictError("The client role cannot be assigned to an employee.");
  }
  const found = await prisma.role.findMany({
    where: { key: { in: roleKeys } },
    select: { key: true },
  });
  if (found.length !== roleKeys.length) {
    throw new ConflictError("One or more selected roles no longer exist.");
  }
}

export async function createEmployeeAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("employees.create");
    const data = parseWithZod(createEmployeeSchema, input);
    await validateRoles(data.roleKeys);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError("A user with this email already exists.");

    const passwordHash = await hashPassword(data.password);
    const employee = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        jobTitle: data.jobTitle,
        kind: UserKind.USER,
        status: data.status,
        passwordHash,
        createdBy: user.id,
        roles: {
          create: data.roleKeys.map((key) => ({ role: { connect: { key } } })),
        },
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "User",
      entityId: employee.id,
      summary: `Employee created: ${employee.name} (${data.roleKeys.join(", ")})`,
    });
    revalidatePath("/employees");
    return { ok: true, id: employee.id };
  } catch (error) {
    return errorResult(error, "createEmployee");
  }
}

export async function updateEmployeeAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("employees.update");
    const data = parseWithZod(updateEmployeeSchema, input);
    await validateRoles(data.roleKeys);

    const existing = await prisma.user.findFirst({
      where: { id, kind: UserKind.USER, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Employee not found.");

    if (id === user.id && data.status !== "ACTIVE") {
      throw new ConflictError("You cannot deactivate your own account.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.update({
        where: { id },
        data: {
          name: data.name,
          phone: data.phone,
          jobTitle: data.jobTitle,
          status: data.status,
          roles: {
            create: data.roleKeys.map((key) => ({ role: { connect: { key } } })),
          },
        },
      });
    });

    await recordAudit({
      actorId: user.id,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      summary: `Employee updated: ${existing.name ?? id} (${data.roleKeys.join(", ")})`,
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "updateEmployee");
  }
}

export async function deleteEmployeeAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("employees.delete");

    const existing = await prisma.user.findFirst({
      where: { id, kind: UserKind.USER, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError("Employee not found.");
    if (id === user.id) {
      throw new ConflictError("You cannot delete your own account.");
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.INACTIVE },
    });

    await recordAudit({
      actorId: user.id,
      action: "DELETE",
      entity: "User",
      entityId: id,
      summary: `Employee deleted: ${existing.name}`,
    });
    revalidatePath("/employees");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "deleteEmployee");
  }
}
