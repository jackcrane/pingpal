import { prisma } from "./prisma.js";

export const disableWorkspace = async (workspaceId, immediate = false) => {
  // Disable the workspace immediately OR at the end of 7th days from now (12:00am on the 8th day).
  if (immediate) {
    await prisma.$queryRaw`UPDATE "Workspace" SET "unavailableAfter" = NOW() WHERE "id" = ${workspaceId}`;
  } else {
    await prisma.$queryRaw`UPDATE "Workspace" SET "unavailableAfter" = NOW() + INTERVAL '7 days' WHERE "id" = ${workspaceId}`;
  }
};
