import express from "express";
import createRouter, { router } from "express-file-routing";
import main from "./app.js";
import cors from "cors";

main();

const app = express();

app.use(cors());

app.use(express.static("basic-statuspage/dist"));
await createRouter(app); // as wrapper function

app.listen(2000, () => {
  console.log("Server is running on port 2000");
});
