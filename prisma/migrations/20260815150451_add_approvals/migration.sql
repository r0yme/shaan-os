-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('INVOICE', 'EXPENSE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "entityId" TEXT NOT NULL,
    "requestorId" TEXT,
    "decidedById" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Approval_status_idx" ON "Approval"("status");

-- CreateIndex
CREATE INDEX "Approval_type_idx" ON "Approval"("type");

-- CreateIndex
CREATE INDEX "Approval_requestorId_idx" ON "Approval"("requestorId");

-- CreateIndex
CREATE INDEX "Approval_deletedAt_idx" ON "Approval"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_type_entityId_key" ON "Approval"("type", "entityId");

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
