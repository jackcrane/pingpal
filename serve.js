console.log(`Heroku requesting port ${process.env.PORT}`);

import express from "express";
import createRouter from "express-file-routing";
import main from "./app.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";
import bodyParser from "body-parser";
import { stripe } from "./lib/stripe.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

main();

const app = express();

app.use((req, res, next) => {
  console.log(
    new Date().toISOString(),
    " | ",
    req.method,
    " | ",
    req.originalUrl
  );
  next();
});

app.use(cors());

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const payload = req.body;
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WHSEC
      );
    } catch (err) {
      console.error(err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(event.type);
    switch (event.type) {
      case "invoice.payment_failed":
        const workspace = await prisma.workspace.update({
          where: {
            stripeCustomerId: event.data.object.customer,
          },
          data: {
            inGoodPaymentStanding: false,
          },
        });
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
);

app.use(express.json());

// Add authentication middleware here
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  // Confirm the JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });
    if (user) {
      const sanitizedUser = { ...user, userId: user.id };
      delete sanitizedUser.password;
      req.user = sanitizedUser;
    }
  } catch {}

  next();
});

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

app.listen(process.env.PORT || 2000, () => {
  console.log(`Server is running on port ${process.env.PORT || 2000}`);
});
