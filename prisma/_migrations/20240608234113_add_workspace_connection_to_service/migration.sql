-- AlterTable
ALTER TABLE `Service` ADD COLUMN `workspaceId` VARCHAR(191) NOT NULL DEFAULT '47309c56-56ee-47af-9782-bbd2c6557136';

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
