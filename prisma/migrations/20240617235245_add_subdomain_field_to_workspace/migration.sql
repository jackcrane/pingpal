/*
  Warnings:

  - A unique constraint covering the columns `[subdomain]` on the table `Workspace` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Workspace` ADD COLUMN `subdomain` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Workspace_subdomain_key` ON `Workspace`(`subdomain`);
