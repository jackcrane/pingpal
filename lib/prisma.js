import { Prisma, PrismaClient } from "@prisma/client";
import pg from "pg";
const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
await client.connect();

export const prisma = new PrismaClient({});

export { Prisma, client as pgClient };
