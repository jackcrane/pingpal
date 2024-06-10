/*
  Warnings:

  - Added the required column `serviceId` to the `Hit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Hit` ADD COLUMN `serviceId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Hit` ADD CONSTRAINT `Hit_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
