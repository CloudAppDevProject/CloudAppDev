-- AlterTable
ALTER TABLE "User" ADD COLUMN "tenantId" INTEGER;

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
