import { Request, Response, NextFunction } from "express";

type Bucket = {
  count: number;
  resetAt: number;
  lastSeenAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 Minute
const MAX_REQUESTS = 60; // 60 Requests / Minute / API-Key

// Cleanup: alte Buckets entfernen (Memory Hardening)
const CLEANUP_INTERVAL_MS = 5 * 60_000; // alle 5 Minuten
const BUCKET_TTL_MS = 30 * 60_000; // Buckets, die 30 Minuten nicht benutzt wurden, löschen

let cleanupStarted = false;
function startCleanupLoop() {
  if (cleanupStarted) return;
  cleanupStarted = true;

  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.lastSeenAt + BUCKET_TTL_MS < now) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  startCleanupLoop();

  const rawKey = req.header("x-api-key");
  const apiKey = (rawKey ?? "anonymous").trim();
  const now = Date.now();

  let bucket = buckets.get(apiKey);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS, lastSeenAt: now };
    buckets.set(apiKey, bucket);
  }

  bucket.lastSeenAt = now;
  bucket.count++;

  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);
  const retryAfterSeconds = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));

  // Standard RateLimit Header
  res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > MAX_REQUESTS) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: "rate limit exceeded",
      retryAfterSeconds,
    });
  }

  return next();
}
