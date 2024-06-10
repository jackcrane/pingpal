import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createService({
  name,
  domain,
  expectedStatus,
  method,
  maxLatency,
  expectedText,
  checkInterval,
}) {
  await prisma.service.create({
    data: {
      name,
      domain,
      expectedStatus,
      method,
      maxLatency,
      checkInterval,
      expectedText,
      workspaceId: "47309c56-56ee-47af-9782-bbd2c6557136",
    },
  });
}

createService({
  name: "Paddlefest",
  domain: "https://status.expo.dev/",
  expectedStatus: 200,
  method: "GET",
  maxLatency: 1000,
  checkInterval: 60,
  expectedText: "All Systems Operational",
});
