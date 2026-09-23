import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

function getAuthSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured");
  }
  return secret;
}

export function createAuthToken(userId: number): string {
  return jwt.sign({ sub: userId }, getAuthSecret(), { expiresIn: "7d" });
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, getAuthSecret());
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    logger.debug({ error }, "Rejected authentication token");
    res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

export function getRequiredUserId(req: Request): number {
  if (!req.userId) {
    throw new Error("Authenticated request is missing a user id");
  }
  return req.userId;
}