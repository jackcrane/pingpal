/*
  Warnings:

  - You are about to drop the column `serviceId` on the `Link` table. All the data in the column will be lost.
  - You are about to drop the column `footerMessage` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `headerLinkId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `showsPingpalLogo` on the `Service` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[headerLinkId]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workspaceId` to the `Link` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Link` DROP FOREIGN KEY `Link_serviceId_fkey`;

-- DropForeignKey
ALTER TABLE `Service` DROP FOREIGN KEY `Service_headerLinkId_fkey`;

-- AlterTable
ALTER TABLE `Link` DROP COLUMN `serviceId`,
    ADD COLUMN `workspaceId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Service` DROP COLUMN `footerMessage`,
    DROP COLUMN `headerLinkId`,
    DROP COLUMN `showsPingpalLogo`;

-- AlterTable
ALTER TABLE `Workspace` ADD COLUMN `footerMessage` VARCHAR(191) NULL,
    ADD COLUMN `headerLinkId` VARCHAR(191) NULL,
    ADD COLUMN `showsPingpalLogo` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX `Workspace_headerLinkId_key` ON `Workspace`(`headerLinkId`);

-- AddForeignKey
ALTER TABLE `Workspace` ADD CONSTRAINT `Workspace_headerLinkId_fkey` FOREIGN KEY (`headerLinkId`) REFERENCES `Link`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Link` ADD CONSTRAINT `Link_workspaceId_fkey` FOREIGN KEY (`workspaceId`) REFERENCES `Workspace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
