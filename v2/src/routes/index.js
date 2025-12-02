export const GET = async (_req, _res, ctx) => {
  ctx.json(200, {
    status: "ok",
    workspace: ctx.config.workspace,
    services: ctx.config.services.map(({ id, name }) => ({ id, name })),
  });
};
