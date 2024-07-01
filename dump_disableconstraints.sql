-- BEGIN;

-- Disable all foreign key constraints
SET CONSTRAINTS ALL DEFERRED;

ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_headerLinkId_fkey";
ALTER TABLE "Service" DROP CONSTRAINT "Service_workspaceId_fkey";
ALTER TABLE "Hit" DROP CONSTRAINT "Hit_serviceId_fkey";
ALTER TABLE "Failure" DROP CONSTRAINT "Failure_serviceId_fkey";
ALTER TABLE "Failure" DROP CONSTRAINT "Failure_outageId_fkey";
ALTER TABLE "Outage" DROP CONSTRAINT "Outage_serviceId_fkey";
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_outageId_fkey";
ALTER TABLE "Link" DROP CONSTRAINT "Link_footerWorkspaceId_fkey";
ALTER TABLE "_UserToWorkspace" DROP CONSTRAINT "_UserToWorkspace_A_fkey";
ALTER TABLE "_UserToWorkspace" DROP CONSTRAINT "_UserToWorkspace_B_fkey";

-- Delete all existing data
TRUNCATE TABLE "Comment" CASCADE;
TRUNCATE TABLE "Failure" CASCADE;
TRUNCATE TABLE "Hit" CASCADE;
TRUNCATE TABLE "Link" CASCADE;
TRUNCATE TABLE "Outage" CASCADE;
TRUNCATE TABLE "Service" CASCADE;
TRUNCATE TABLE "User" CASCADE;
TRUNCATE TABLE "Workspace" CASCADE;

-- Import the data
\i dump.sql

-- Enable all foreign key constraints

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_headerLinkId_fkey" FOREIGN KEY ("headerLinkId") REFERENCES "Link" ("id");
ALTER TABLE "Service" ADD CONSTRAINT "Service_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id");
ALTER TABLE "Hit" ADD CONSTRAINT "Hit_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id");
ALTER TABLE "Failure" ADD CONSTRAINT "Failure_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id");
ALTER TABLE "Failure" ADD CONSTRAINT "Failure_outageId_fkey" FOREIGN KEY ("outageId") REFERENCES "Outage" ("id");
ALTER TABLE "Outage" ADD CONSTRAINT "Outage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id");
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_outageId_fkey" FOREIGN KEY ("outageId") REFERENCES "Outage" ("id");
ALTER TABLE "Link" ADD CONSTRAINT "Link_footerWorkspaceId_fkey" FOREIGN KEY ("footerWorkspaceId") REFERENCES "Workspace" ("id");
ALTER TABLE "_UserToWorkspace" ADD CONSTRAINT "_UserToWorkspace_A_fkey" FOREIGN KEY ("A") REFERENCES "User" ("id");
ALTER TABLE "_UserToWorkspace" ADD CONSTRAINT "_UserToWorkspace_B_fkey" FOREIGN KEY ("B") REFERENCES "Workspace" ("id");

-- COMMIT;
