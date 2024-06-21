/*
  Warnings:

  - A unique constraint covering the columns `[headerLinkId]` on the table `Service` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Service` ADD COLUMN `footerMessage` VARCHAR(191) NULL,
    ADD COLUMN `headerLinkId` VARCHAR(191) NULL,
    ADD COLUMN `showsPingpalLogo` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `Link` (
    `id` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `icon` ENUM('GITHUB', 'TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'DISCORD', 'SLACK', 'PHONE', 'EMAIL', 'WEBSITE', 'BLOG', 'PAYMENT', 'BTC', 'ETH', 'DRIBBBLE') NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Service_headerLinkId_key` ON `Service`(`headerLinkId`);

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_headerLinkId_fkey` FOREIGN KEY (`headerLinkId`) REFERENCES `Link`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Link` ADD CONSTRAINT `Link_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
