-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'LAUNCH', 'PRO');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
