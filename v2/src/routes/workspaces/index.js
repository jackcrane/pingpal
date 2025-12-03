export const GET = async (_req, _res, ctx) => {
  try {
    const { workspace, services } = ctx.config;
    ctx.json(200, {
      ...workspace,
      services: services.map(({ id, name, url }) => ({ id, name, url })),
    });
  } catch (err) {
    console.error("[routes] GET /workspaces error:", err.message);
    ctx.json(500, { error: "Failed to load workspaces" });
  }
};
