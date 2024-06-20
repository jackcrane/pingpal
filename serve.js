import express from "express";
import createRouter, { router } from "express-file-routing";
import main from "./app.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

main();

const app = express();

app.use(cors());

app.use(express.static("basic-statuspage/dist"));
await createRouter(app); // as wrapper function

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "basic-statuspage/dist", "index.html"));
});

app.listen(2000, () => {
  console.log("Server is running on port 2000");
});
