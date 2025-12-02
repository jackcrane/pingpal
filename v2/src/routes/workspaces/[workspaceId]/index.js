const ensureWorkspace = (ctx) => {
  const requested = ctx.params.workspaceId;
  if (requested !== ctx.config.workspace.id) {
    ctx.json(404, { error: "Workspace not found" });
    return false;
  }
  return true;
};

export const GET = async (_req, _res, ctx) => {
  if (!ensureWorkspace(ctx)) return;
  const { workspace, services, defaults } = ctx.config;
  ctx.json(200, {
    ...workspace,
    defaults,
    services: services.map(({ id, name, url }) => ({ id, name, url })),
  });
};
