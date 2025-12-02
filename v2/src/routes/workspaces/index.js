export const GET = async (_req, _res, ctx) => {
  const { workspace, services } = ctx.config;
  ctx.json(200, {
    ...workspace,
    services: services.map(({ id, name, url }) => ({ id, name, url })),
  });
};
