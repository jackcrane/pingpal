import { prisma } from "../../../../../lib/prisma.js";

export const get = async (req, res) => {
  let _event = await prisma.hit.findUnique({
    where: {
      id: req.params.eventId,
    },
  });
  if (!_event) {
    _event = await prisma.failure.findUnique({
      where: {
        id: req.params.eventId,
      },
    });
  }
  return res.json({
    ..._event,
    headers: (_event.headers && JSON.parse(_event.headers)) || undefined,
    body:
      req.query.includeBody && req.query.includeBody === "true"
        ? _event.body
        : undefined,
  });
};
