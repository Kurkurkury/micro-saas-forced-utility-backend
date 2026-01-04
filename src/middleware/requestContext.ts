import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

/**
 * Adds a request id to every request/response:
 * - res header: x-request-id
 * - req: (req as any).requestId
 *
 * Also provides a tiny helper to send consistent errors.
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("x-request-id")?.trim() || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  return next();
}

/**
 * Express error handler: must be registered AFTER all routes.
 * Returns JSON with requestId.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = (req as any).requestId ?? null;

  // Avoid leaking internal details in production
  const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
  const message =
    !isProd && err?.message ? String(err.message) : "internal error";

  // If headers already sent, delegate to default Express handler
  if (res.headersSent) return;

  const status = typeof err?.status === "number" ? err.status : 500;

  return res.status(status).json({
    error: message,
    requestId,
  });
}
