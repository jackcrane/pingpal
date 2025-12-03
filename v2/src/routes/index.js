export const GET = async (_req, _res, ctx) => {
  try {
    ctx.json(200, {
      status: "ok",
      workspace: ctx.config.workspace,
      services: ctx.config.services.map(({ id, name }) => ({ id, name })),
    });
  } catch (err) {
    console.error("[routes] GET / error:", err.message);
    ctx.json(500, { error: "Failed to load workspace summary" });
  }
};
