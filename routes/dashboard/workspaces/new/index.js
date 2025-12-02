export const get = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const newWorkspaceTemplate = {
    id: "new",
    name: "",
    subdomain: "",
    tier: "FREE",
    services: [],
    createdAt: new Date().toISOString(),
    inGoodPaymentStanding: false,
  };

  return res.json(newWorkspaceTemplate);
};
