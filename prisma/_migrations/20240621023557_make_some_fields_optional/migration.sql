/*
  Warnings:

  - You are about to drop the column `workspaceId` on the `Link` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Link` DROP FOREIGN KEY `Link_workspaceId_fkey`;

-- AlterTable
ALTER TABLE `Link` DROP COLUMN `workspaceId`,
    ADD COLUMN `footerWorkspaceId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Link` ADD CONSTRAINT `Link_footerWorkspaceId_fkey` FOREIGN KEY (`footerWorkspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
