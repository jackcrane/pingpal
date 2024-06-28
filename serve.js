import express from "express";
import createRouter from "express-file-routing";
import main from "./app.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

main();

const app = express();

app.use(cors());

app.use("/assets", express.static("static"));

app.use((req, res, next) => {
  let host = req.hostname;
  const subdomain = host.split(".")[0];
  host = host.replace(".online", "");

  console.log(subdomain, host);
  if (subdomain === "dashboard") {
    console.log("dashboard");
    express.static(path.join(__dirname, "dashboard/dist"))(req, res, next);
  } else if (subdomain !== "dashboard" && host.includes(".")) {
    console.log("basic-statuspage");
    express.static(path.join(__dirname, "basic-statuspage/dist"))(
      req,
      res,
      next
    );
  } else {
    console.log("landing");
    express.static(path.join(__dirname, "landing/dist"))(req, res, next);
  }
});

await createRouter(app);

app.get("*", (req, res) => {
  const host = req.hostname;
  const subdomain = host.split(".")[0];

  if (subdomain === "dashboard") {
    res.sendFile(path.join(__dirname, "dashboard/dist", "index.html"));
  } else if (subdomain !== "dashboard" && host.includes(".")) {
    res.sendFile(path.join(__dirname, "basic-statuspage/dist", "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "landing/dist", "index.html"));
  }
});

app.listen(2000, () => {
  console.log("Server is running on port 2000");
});

// setInterval(async () => {
//   const metrics = await prisma.$metrics.json();
//   console.log(
//     new Date().toISOString(),
//     " Open pool connections: ",
//     getFromKey("prisma_pool_connections_open", metrics.counters).value,
//     " | Active queries: ",
//     getFromKey("prisma_client_queries_active", metrics.gauges).value,
//     " | Waiting queries: ",
//     getFromKey("prisma_client_queries_wait", metrics.gauges).value,
//     " | Busy connections: ",
//     getFromKey("prisma_pool_connections_busy", metrics.gauges).value,
//     " | Idle connections: ",
//     getFromKey("prisma_pool_connections_idle", metrics.gauges).value
//   );
//   // await prisma.$disconnect();
// }, 1000);

const getFromKey = (key, arr) => {
  return arr.find((item) => item.key === key);
};
