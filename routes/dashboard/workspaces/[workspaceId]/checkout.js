import { prisma } from "../../../../lib/prisma.js";
import { stripe } from "../../../../lib/stripe.js";
import { requireAuth } from "../../utils.js";

export const get = async (req, res) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) {
      return;
    }

    const workspaceId = req.params.workspaceId;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        users: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    let customerId;
    if (!workspace.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
      });
      customerId = customer.id;

      // Update the workspace with the new Stripe customer ID
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customerId },
      });
    } else {
      customerId = workspace.stripeCustomerId;
    }

    // Fetch the customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    let session;
    if (paymentMethods.data.length > 0) {
      // If the user has payment methods, create a billing portal session to manage them
      session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${
          process.env.NODE_ENV === "production"
            ? "https://pingpal.online"
            : "http://localhost:5173"
        }/workspace/${workspace.id}`,
      });
    } else {
      // If the user has no payment methods, create a checkout session to add a new one
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "setup",
        payment_method_types: ["card"],
        success_url: `${
          process.env.NODE_ENV === "production"
            ? "https://pingpal.online"
            : "http://localhost:5173"
        }/workspace/${workspace.id}`,
        cancel_url: `${
          process.env.NODE_ENV === "production"
            ? "https://pingpal.online"
            : "http://localhost:5173"
        }/workspace/${workspace.id}`,
      });
    }

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
