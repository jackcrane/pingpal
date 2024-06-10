import express from "express";
import createRouter, { router } from "express-file-routing";
import main from "./app.js";

main();

const app = express();

await createRouter(app); // as wrapper function

app.listen(2000, () => {
  console.log("Server is running on port 2000");
});
