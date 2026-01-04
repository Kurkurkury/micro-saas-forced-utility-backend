import { Request, Response, NextFunction } from "express";
import { getApiKey } from "../db/apiKeys.js";

export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.header("x-api-key")?.trim();

  if (!key) {
    return res.status(401).json({ error: "missing api key" });
  }

  const apiKey = await getApiKey(key);

  if (!apiKey) {
    return res.status(403).json({ error: "invalid or revoked api key" });
  }

  (req as any).jobKeyFromApiKey = apiKey.jobKey;

  return next();
}
