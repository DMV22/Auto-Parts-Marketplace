-- AlterTable
ALTER TABLE "SavedVehicle" ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeSavedVehicleId" UUID;

-- CreateIndex
CREATE INDEX "SavedVehicle_userId_year_vehicleGenerationId_engineTypeId_idx" ON "SavedVehicle"("userId", "year", "vehicleGenerationId", "engineTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_activeSavedVehicleId_key" ON "User"("activeSavedVehicleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeSavedVehicleId_fkey" FOREIGN KEY ("activeSavedVehicleId") REFERENCES "SavedVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
