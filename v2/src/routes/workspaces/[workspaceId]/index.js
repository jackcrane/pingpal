const ensureWorkspace = (ctx) => {
  const requested = ctx.params.workspaceId;
  if (requested !== ctx.config.workspace.id) {
    ctx.json(404, { error: "Workspace not found" });
    return false;
  }
  return true;
};

export const GET = async (_req, _res, ctx) => {
  try {
    if (!ensureWorkspace(ctx)) return;
    const { workspace, services, defaults } = ctx.config;
    ctx.json(200, {
      ...workspace,
      defaults,
      services: services.map(({ id, name, url, group }) => ({
        id,
        name,
        url,
        ...(typeof group === "string" && group.length ? { group } : {}),
      })),
    });
  } catch (err) {
    console.error(
      "[routes] GET /workspaces/:workspaceId error:",
      err.message
    );
    ctx.json(500, { error: "Failed to load workspace details" });
  }
};
