import { refreshConfigNow } from "../../lib/config.js";

export const POST = async (_req, _res, ctx) => {
  try {
    const config = await refreshConfigNow();
    if (typeof ctx.clearCache === "function") {
      ctx.clearCache();
    }
    ctx.json(200, {
      refreshed: true,
      workspaceId: config.workspace?.id,
      services: config.services?.length || 0,
    });
  } catch (err) {
    console.error("[admin] Config refresh failed:", err.message);
    ctx.json(500, { error: "Failed to refresh configuration" });
  }
};
