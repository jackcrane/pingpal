-- CreateIndex
CREATE INDEX "Failure_serviceId_createdAt_idx" ON "Failure"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "Hit_serviceId_createdAt_idx" ON "Hit"("serviceId", "createdAt");
