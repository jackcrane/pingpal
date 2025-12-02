export const resolveUserId = (req) => req.user?.userId ?? req.user?.id ?? null;

export const requireAuth = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return userId;
};
