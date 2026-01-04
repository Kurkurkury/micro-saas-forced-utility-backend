import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { getLatestRun } from "../db/jobRuns.js";

const router = Router();

type PublicCfgRow = {
  jobKey: string;
  expectedEveryMinutes: number;
  graceMinutes: number;
};

function computeState(input: {
  expectedEveryMinutes: number;
  graceMinutes: number;
  lastRunAt: Date | null;
}): { state: "ok" | "overdue" | "never"; ageSeconds: number | null } {
  if (!input.lastRunAt) return { state: "never", ageSeconds: null };

  const now = Date.now();
  const ageMs = now - input.lastRunAt.getTime();

  const expectedMs = input.expectedEveryMinutes * 60_000;
  const graceMs = input.graceMinutes * 60_000;
  const deadlineMs = expectedMs + graceMs;

  return {
    state: ageMs > deadlineMs ? "overdue" : "ok",
    ageSeconds: Math.round(ageMs / 1000),
  };
}

/**
 * GET /public/status/:token
 * Öffentlich: minimaler Status (kein Leak von jobKey)
 */
router.get("/status/:token", async (req, res) => {
  const token = req.params.token;

  const rows = await prisma.$queryRaw<PublicCfgRow[]>`
    SELECT "jobKey", "expectedEveryMinutes", "graceMinutes"
    FROM "JobConfig"
    WHERE "publicToken" = ${token}
    LIMIT 1
  `;

  const cfg = rows[0];

  if (!cfg) {
    return res.status(404).json({ error: "unknown token" });
  }

  const latest = await getLatestRun(cfg.jobKey);
  const lastRunAt = latest ? latest.createdAt : null;

  const { state, ageSeconds } = computeState({
    expectedEveryMinutes: cfg.expectedEveryMinutes,
    graceMinutes: cfg.graceMinutes,
    lastRunAt,
  });

  return res.json({
    token,
    state,
    lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
    ageSeconds,
  });
});

/**
 * GET /public/badge/:token.svg
 * Öffentlich: SVG Badge (ok/overdue/never)
 */
router.get("/badge/:token.svg", async (req, res) => {
  const token = req.params.token;

  const rows = await prisma.$queryRaw<PublicCfgRow[]>`
    SELECT "jobKey", "expectedEveryMinutes", "graceMinutes"
    FROM "JobConfig"
    WHERE "publicToken" = ${token}
    LIMIT 1
  `;

  const cfg = rows[0];

  res.setHeader("content-type", "image/svg+xml; charset=utf-8");

  if (!cfg) {
    return res.status(404).send(
      `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20">
        <rect width="180" height="20" fill="#555"/>
        <text x="10" y="14" fill="#fff" font-family="Verdana" font-size="11">unknown token</text>
      </svg>`
    );
  }

  const latest = await getLatestRun(cfg.jobKey);
  const lastRunAt = latest ? latest.createdAt : null;

  const { state } = computeState({
    expectedEveryMinutes: cfg.expectedEveryMinutes,
    graceMinutes: cfg.graceMinutes,
    lastRunAt,
  });

  const label = "job";
  const value = state;
  const color = state === "ok" ? "#2ea44f" : state === "overdue" ? "#d73a49" : "#9a9a9a";

  const leftWidth = 60;
  const rightWidth = 120;
  const totalWidth = leftWidth + rightWidth;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
    <linearGradient id="s" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="r">
      <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#r)">
      <rect width="${leftWidth}" height="20" fill="#555"/>
      <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
      <rect width="${totalWidth}" height="20" fill="url(#s)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="Verdana" font-size="11">
      <text x="${leftWidth / 2}" y="14">${label}</text>
      <text x="${leftWidth + rightWidth / 2}" y="14">${value}</text>
    </g>
  </svg>`.trim();

  return res.status(200).send(svg);
});

export default router;
