import { Request, Response, NextFunction } from "express";
import { getApiKey } from "../db/apiKeys.js";

export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.header("x-api-key");

  if (!header) {
    return res.status(401).json({ error: "missing api key" });
  }

  const apiKey = await getApiKey(header);

  if (!apiKey) {
    return res.status(403).json({ error: "invalid api key" });
  }

  (req as any).jobKeyFromApiKey = apiKey.jobKey;

  return next();
}
