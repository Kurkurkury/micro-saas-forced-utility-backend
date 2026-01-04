import { listJobConfigs } from "../db/jobConfigs.js";
import { getLatestRun } from "../db/jobRuns.js";
import { sendFailEmail } from "../notify/email.js";

export async function runHeartbeatCheck() {
  try {
    const now = Date.now();

    // If DB schema is not migrated yet, this can throw.
    // We intentionally do NOT crash the app / spam logs.
    const configs = await listJobConfigs();

    console.log(
      `[HB] tick configs=${configs.length} now=${new Date(now).toISOString()}`
    );

    for (const cfg of configs) {
      const latest = await getLatestRun(cfg.jobKey);

      const expectedMs = cfg.expectedEveryMinutes * 60_000;
      const graceMs = cfg.graceMinutes * 60_000;
      const deadline = expectedMs + graceMs;

      const lastTs = latest ? latest.createdAt.getTime() : 0;
      const age = now - lastTs;

      if (!latest || age > deadline) {
        console.log(
          `[HB] ${cfg.jobKey} -> overdue age=${Math.round(
            age / 1000
          )}s deadline=${Math.round(deadline / 1000)}s; sending alert`
        );

        await sendFailEmail({
          jobKey: cfg.jobKey,
          message: latest
            ? `job overdue by ${Math.round((age - deadline) / 1000)} seconds`
            : `job has never reported a run`,
        });
      } else {
        console.log(`[HB] ${cfg.jobKey} -> ok age=${Math.round(age / 1000)}s`);
      }
    }
  } catch (err: any) {
    // Prisma schema mismatch / missing column / missing tables etc.
    // Keep the service healthy; log a single concise line.
    const msg = err?.message ? String(err.message) : String(err);
    console.warn(`[HB] skipped (db not ready): ${msg}`);
    return;
  }
}
