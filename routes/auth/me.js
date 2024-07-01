import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const post = async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.userId,
    },
  });

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  return res.json(user);
};
