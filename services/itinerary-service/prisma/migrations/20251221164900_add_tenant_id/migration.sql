-- AlterTable
ALTER TABLE "Itinerary" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "tenantId" INTEGER;

-- CreateIndex
CREATE INDEX "Itinerary_tenantId_idx" ON "Itinerary"("tenantId");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");
