import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { randomBytes } from "node:crypto";
import { createJobConfig, upsertJobConfig, deleteJobConfig } from "../db/jobConfigs.js";

const router = Router();

function genPublicToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * GET /job-configs
 * Admin-only
 */
router.get("/", async (_req, res) => {
  const configs = await prisma.jobConfig.findMany({
    orderBy: { createdAt: "desc" },
  });
  return res.json({ configs });
});

/**
 * GET /job-configs/:jobKey
 */
router.get("/:jobKey", async (req, res) => {
  const jobKey = req.params.jobKey;

  const cfg = await prisma.jobConfig.findUnique({
    where: { jobKey },
  });

  if (!cfg) return res.status(404).json({ error: "not found" });
  return res.json({ config: cfg });
});

/**
 * POST /job-configs
 */
router.post("/", async (req, res) => {
  const { jobKey, expectedEveryMinutes, graceMinutes } = req.body ?? {};

  if (
    typeof jobKey !== "string" ||
    typeof expectedEveryMinutes !== "number" ||
    typeof graceMinutes !== "number"
  ) {
    return res.status(400).json({ error: "invalid payload" });
  }

  await createJobConfig({
    jobKey: jobKey.trim(),
    expectedEveryMinutes,
    graceMinutes,
  });

  const created = await prisma.jobConfig.findUnique({
    where: { jobKey: jobKey.trim() },
  });

  return res.status(201).json({ ok: true, config: created });
});

/**
 * PUT /job-configs/:jobKey
 */
router.put("/:jobKey", async (req, res) => {
  const jobKey = req.params.jobKey;
  const { expectedEveryMinutes, graceMinutes } = req.body ?? {};

  if (typeof expectedEveryMinutes !== "number" || typeof graceMinutes !== "number") {
    return res.status(400).json({ error: "invalid payload" });
  }

  await upsertJobConfig({
    jobKey: jobKey.trim(),
    expectedEveryMinutes,
    graceMinutes,
  });

  const updated = await prisma.jobConfig.findUnique({
    where: { jobKey: jobKey.trim() },
  });

  return res.json({ ok: true, config: updated });
});

/**
 * POST /job-configs/:jobKey/rotate-public-token
 * Robust + TS-sicher: nutzt SQL UPDATE ... RETURNING statt Prisma-typed update
 */
router.post("/:jobKey/rotate-public-token", async (req, res) => {
  const jobKey = req.params.jobKey;

  // 3 tries for ultra-rare unique collision
  for (let i = 0; i < 3; i++) {
    const newToken = genPublicToken();

    try {
      const rows = await prisma.$queryRaw<{ jobKey: string; publicToken: string }[]>`
        UPDATE "JobConfig"
        SET "publicToken" = ${newToken}
        WHERE "jobKey" = ${jobKey}
        RETURNING "jobKey", "publicToken"
      `;

      const row = rows[0];
      if (!row) return res.status(404).json({ error: "not found" });

      return res.json({
        ok: true,
        jobKey: row.jobKey,
        publicToken: row.publicToken,
      });
    } catch {
      if (i === 2) {
        return res.status(500).json({ error: "could not rotate token" });
      }
      // retry (collision extremely unlikely, but safe)
    }
  }

  return res.status(500).json({ error: "could not rotate token" });
});

/**
 * DELETE /job-configs/:jobKey
 */
router.delete("/:jobKey", async (req, res) => {
  const jobKey = req.params.jobKey;
  await deleteJobConfig(jobKey);
  return res.json({ ok: true });
});

export default router;
