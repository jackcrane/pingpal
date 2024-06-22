import express from "express";
import createRouter, { router } from "express-file-routing";
import main from "./app.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// console.log(process.env);

main();

const app = express();

app.use(cors());

app.use("/assets", express.static("static"));
app.use(express.static("basic-statuspage/dist"));
await createRouter(app); // as wrapper function

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "basic-statuspage/dist", "index.html"));
});

app.listen(2000, () => {
  console.log("Server is running on port 2000");
});

setInterval(async () => {
  const metrics = await prisma.$metrics.json();
  console.log(
    new Date().toISOString(),
    " Open pool connections: ",
    getFromKey("prisma_pool_connections_open", metrics.counters).value,
    " | Active queries: ",
    getFromKey("prisma_client_queries_active", metrics.gauges).value,
    " | Waiting queries: ",
    getFromKey("prisma_client_queries_wait", metrics.gauges).value,
    " | Busy connections: ",
    getFromKey("prisma_pool_connections_busy", metrics.gauges).value,
    " | Idle connections: ",
    getFromKey("prisma_pool_connections_idle", metrics.gauges).value
  );
  // await prisma.$disconnect();
}, 1000);

const getFromKey = (key, arr) => {
  return arr.find((item) => item.key === key);
};
