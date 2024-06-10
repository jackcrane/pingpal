/*
  Warnings:

  - Added the required column `serviceId` to the `Failure` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Failure` ADD COLUMN `serviceId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Failure` ADD CONSTRAINT `Failure_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
