/*
  Warnings:

  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Failure` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Hit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Link` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Outage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Service` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Workspace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserToWorkspace` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_outageId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Failure" DROP CONSTRAINT "Failure_outageId_fkey";

-- DropForeignKey
ALTER TABLE "Failure" DROP CONSTRAINT "Failure_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Hit" DROP CONSTRAINT "Hit_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Link" DROP CONSTRAINT "Link_footerWorkspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Outage" DROP CONSTRAINT "Outage_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_headerLinkId_fkey";

-- DropForeignKey
ALTER TABLE "_UserToWorkspace" DROP CONSTRAINT "_UserToWorkspace_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserToWorkspace" DROP CONSTRAINT "_UserToWorkspace_B_fkey";

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Failure";

-- DropTable
DROP TABLE "Hit";

-- DropTable
DROP TABLE "Link";

-- DropTable
DROP TABLE "Outage";

-- DropTable
DROP TABLE "Service";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Workspace";

-- DropTable
DROP TABLE "_UserToWorkspace";

-- DropEnum
DROP TYPE "FailureReason";

-- DropEnum
DROP TYPE "Icon";

-- DropEnum
DROP TYPE "OutageStatus";

-- DropEnum
DROP TYPE "Role";

-- DropEnum
DROP TYPE "SubscriptionTier";
