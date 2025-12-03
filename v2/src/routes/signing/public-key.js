import { ENCRYPTED_PREFIX, getPublicKeyPem } from "../../lib/signing.js";

export const GET = async (_req, _res, ctx) => {
  ctx.json(200, {
    workspaceId: ctx.config.workspace.id,
    publicKey: getPublicKeyPem(),
    prefix: ENCRYPTED_PREFIX,
  });
};
