-- DropForeignKey
ALTER TABLE `Failure` DROP FOREIGN KEY `Failure_serviceId_fkey`;

-- DropForeignKey
ALTER TABLE `Hit` DROP FOREIGN KEY `Hit_serviceId_fkey`;

-- DropForeignKey
ALTER TABLE `Service` DROP FOREIGN KEY `Service_workspaceId_fkey`;

-- AlterTable
ALTER TABLE `Service` MODIFY `lastCheck` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hit` ADD CONSTRAINT `Hit_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Failure` ADD CONSTRAINT `Failure_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
