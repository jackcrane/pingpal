import { FailureReason, OutageStatus, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import fetch from "node-fetch";

async function logFailure({
  service,
  status,
  headers,
  latency,
  message,
  reason,
  body,
}) {
  // Check if there is an existing open outage
  let outage = await prisma.outage.findFirst({
    where: {
      serviceId: service.id,
      status: OutageStatus.OPEN,
    },
  });

  if (!outage) {
    // Create a new outage if none exists
    outage = await prisma.outage.create({
      data: {
        serviceId: service.id,
        status: OutageStatus.OPEN,
      },
    });
  }

  await prisma.failure.create({
    data: {
      serviceId: service.id,
      status: status || null,
      headers: service.collectHeaders ? JSON.stringify(headers) || null : null,
      latency: latency || null,
      autogeneratedMessage: message,
      reason: reason,
      body: service.collectBody ? body || null : null,
      outageId: outage.id,
    },
  });
}

async function closeOutage(serviceId) {
  // Close any existing open outages for the service
  await prisma.outage.updateMany({
    where: {
      serviceId: serviceId,
      status: OutageStatus.OPEN,
    },
    data: {
      status: OutageStatus.CLOSED,
    },
  });
}

async function pingService(service) {
  const serviceId = service.id;
  await prisma.$queryRaw`
    UPDATE "Service" SET "lastCheck" = NOW() WHERE id = ${serviceId};
  `;
  const startTime = new Date();
  let request;
  try {
    request = await fetch(service.domain, {
      headers: JSON.parse(service.headers),
      body: service.method === "GET" ? null : service.body,
      method: service.method,
    });
  } catch (error) {
    console.log(`Service ${service.name} is down [HTTP Error]`);
    logFailure({
      service: service,
      message: "The URL could not be resolved (HTTP Error)",
      reason: FailureReason.REQUEST_FAILURE,
    });
    return;
  }
  const endTime = new Date();
  const responseTime = endTime - startTime;
  if (responseTime > service.maxLatency) {
    console.log(`Service ${service.name} is down [Latency (${responseTime})]`);
    logFailure({
      service: service,
      status: request.status,
      headers: request.headers.raw(),
      latency: responseTime,
      message: `The service took too long to respond`,
      reason: FailureReason.LATENCY,
    });
    return;
  }
  if (!request) {
    console.log(`Service ${service.name} is down [No Response]`);
    logFailure({
      service: service,
      status: null,
      headers: null,
      latency: null,
      message: "The service did not respond",
      reason: FailureReason.NO_RESPONSE,
    });
    return;
  }
  if (request.status !== service.expectedStatus) {
    console.log(
      `Service ${service.name} is down [Status Code (${request.status})]`
    );
    logFailure({
      service: service,
      status: request.status,
      headers: request.headers.raw(),
      body: await request.text(),
      latency: responseTime,
      message: `The service returned an unexpected status code`,
      reason: FailureReason.STATUS_CODE,
    });
    return;
  }
  if (service.expectedText && service.expectedText !== "") {
    const data = await request.text();
    if (!data.toLowerCase().includes(service.expectedText?.toLowerCase())) {
      console.log(`Service ${service.name} is down [Text]`);
      logFailure({
        service: service,
        status: request.status,
        headers: request.headers.raw(),
        body: data,
        latency: responseTime,
        message: `The service did not return the expected text`,
        reason: FailureReason.EXPECTED_TEXT,
      });
      return;
    }
  }
  console.log(`Service ${service.name} is up`);
  await prisma.hit.create({
    data: {
      serviceId: serviceId,
      latency: responseTime,
    },
  });
  await closeOutage(serviceId);
}

async function main() {
  const services = await prisma.$queryRaw`
    SELECT *
    FROM "Service"
    WHERE AGE(NOW(), "lastCheck") > ("checkInterval" || ' seconds')::INTERVAL;
  `;
  for (const service of services) {
    pingService(service);
  }
}

export default function () {
  setInterval(main, 1000);
}
