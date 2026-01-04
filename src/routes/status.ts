import { Router } from "express";
import { listJobConfigs } from "../db/jobConfigs.js";
import { getLatestRun } from "../db/jobRuns.js";

const router = Router();

/**
 * GET /status/overview
 * Admin-only (wird in index.ts mit adminAuth geschützt)
 *
 * Liefert:
 * - jobKey
 * - publicToken (zum Copy/Paste für Kunden)
 * - state: ok | overdue | never
 * - lastRunAt / ageSeconds
 */
router.get("/overview", async (_req, res) => {
  const now = Date.now();
  const configs = await listJobConfigs();

  const items = await Promise.all(
    configs.map(async (cfg) => {
      const latest = await getLatestRun(cfg.jobKey);

      const expectedMs = cfg.expectedEveryMinutes * 60_000;
      const graceMs = cfg.graceMinutes * 60_000;
      const deadlineMs = expectedMs + graceMs;

      if (!latest) {
        return {
          jobKey: cfg.jobKey,
          publicToken: (cfg as any).publicToken ?? null,
          expectedEveryMinutes: cfg.expectedEveryMinutes,
          graceMinutes: cfg.graceMinutes,
          state: "never" as const,
          lastRunAt: null as string | null,
          ageSeconds: null as number | null,
          lastStatus: null as string | null,
        };
      }

      const ageMs = now - latest.createdAt.getTime();
      const overdue = ageMs > deadlineMs;

      return {
        jobKey: cfg.jobKey,
        publicToken: (cfg as any).publicToken ?? null,
        expectedEveryMinutes: cfg.expectedEveryMinutes,
        graceMinutes: cfg.graceMinutes,
        state: overdue ? ("overdue" as const) : ("ok" as const),
        lastRunAt: latest.createdAt.toISOString(),
        ageSeconds: Math.round(ageMs / 1000),
        lastStatus: latest.status,
      };
    })
  );

  // overdue zuerst, dann ok, dann never
  const rank = (s: string) => (s === "overdue" ? 0 : s === "ok" ? 1 : 2);
  items.sort((a, b) => rank(a.state) - rank(b.state));

  return res.json({ ok: true, now: new Date(now).toISOString(), items });
});

export default router;
