import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import jobsRouter from "./routes/jobs.js";
import jobConfigsRouter from "./routes/jobConfigs.js";
import apiKeysRouter from "./routes/apiKeys.js";
import statusRouter from "./routes/status.js";
import publicRouter from "./routes/public.js";

import { apiKeyAuth } from "./middleware/apiKeyAuth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { adminAuth } from "./middleware/adminAuth.js";
import { requestContext, errorHandler } from "./middleware/requestContext.js";
import { runHeartbeatCheck } from "./jobs/heartbeatCheck.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// request id for every request (first!)
app.use(requestContext);

/**
 * 🔓 Public healthcheck (ohne Keys)
 */
app.get("/status", (_req, res) => {
  return res.json({ ok: true, ts: new Date().toISOString() });
});

/**
 * 🟢 Public status badge (SVG)
 */
app.get("/status/badge", (_req, res) => {
  const ok = true; // später optional dynamisch

  const label = "status";
  const message = ok ? "up" : "down";
  const color = ok ? "#4c1" : "#e05d44";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="20" role="img" aria-label="${label}: ${message}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="110" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="55" height="20" fill="#555"/>
    <rect x="55" width="55" height="20" fill="${color}"/>
    <rect width="110" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="28" y="14">${label}</text>
    <text x="82" y="14">${message}</text>
  </g>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.status(200).send(svg);
});

/**
 * 🔓 Public endpoints (ohne Keys)
 */
app.use("/public", publicRouter);

/**
 * 🔐 Admin status overview
 */
app.use("/status", adminAuth, statusRouter);

/**
 * 🔐 Jobs API (kundenseitig)
 */
app.use("/jobs", apiKeyAuth, rateLimit, jobsRouter);

/**
 * 🔐 Admin / Management API (nur du)
 */
app.use("/api-keys", adminAuth, apiKeysRouter);
app.use("/job-configs", adminAuth, jobConfigsRouter);

/**
 * ❤️ Heartbeat checker (optional, feature-flagged)
 * ENABLE_HEARTBEAT=true → aktiv
 * default: AUS (kein Log-Spam, kein Crash)
 */
if (process.env.ENABLE_HEARTBEAT === "true") {
  setInterval(() => {
    runHeartbeatCheck().catch(() => {
      // intentionally silent – heartbeat must never spam logs
    });
  }, 30_000);
}

// error handler LAST
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
