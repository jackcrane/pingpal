import { prisma } from "../../../../lib/prisma.js";
import { stripe } from "../../../../lib/stripe.js";
import { requireAuth } from "../../utils.js";

export const get = async (req, res) => {
  // Wait 500ms
  await new Promise((r) => setTimeout(r, 500));

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
      include: {
        services: req.query.includeServices === "true",
      },
    });

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const stripeCustomerId = workspace?.stripeCustomerId;
    if (stripeCustomerId) {
      // Make sure the customer has a payment method and is in good standing
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      const paymentMethods = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: "card",
      });
      console.log(paymentMethods.data && paymentMethods.data.length > 0);
      workspace.inGoodPaymentStanding = paymentMethods.data.length > 0;
    } else {
      workspace.inGoodPaymentStanding = false;
    }

    console.log(workspace);

    return res.json(workspace);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
