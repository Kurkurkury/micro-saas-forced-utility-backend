import type { Request, Response, NextFunction } from "express";

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const adminKey = req.header("x-admin-key")?.trim();
  const expected = process.env.ADMIN_KEY?.trim();

  if (!expected) {
    // Sicherheits-default: wenn kein ADMIN_KEY gesetzt ist, blocken wir Admin-Routen.
    return res.status(500).json({
      error:
        "ADMIN_KEY is not set on server. Set ADMIN_KEY in .env to use admin routes.",
    });
  }

  if (!adminKey) {
    return res.status(401).json({ error: "missing x-admin-key" });
  }

  if (adminKey !== expected) {
    return res.status(403).json({ error: "invalid admin key" });
  }

  next();
}
