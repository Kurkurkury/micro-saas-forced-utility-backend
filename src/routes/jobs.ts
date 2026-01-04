import { Router } from "express";
import { recordRun } from "../db/jobRuns.js";
import { sendFailEmail } from "../notify/email.js";

const router = Router();

/**
 * POST /jobs/ack
 * Header:
 *   x-api-key: <api key>
 *
 * Kurzform für Job-Runner:
 * - meldet einfach "ok"
 * - kein Body nötig
 */
router.post("/ack", async (req, res) => {
  const jobKey = (req as any).jobKeyFromApiKey as string | undefined;

  if (!jobKey) {
    return res.status(500).json({
      error: "missing jobKey on request (apiKey middleware not applied)",
    });
  }

  const run = await recordRun({
    jobKey,
    status: "ok",
  });

  return res.status(201).json({ ok: true, run });
});

/**
 * POST /jobs/report
 * Header:
 *   x-api-key: <api key>
 * Body:
 * {
 *   "status": "ok" | "fail",
 *   "message": "optional text"
 * }
 */
router.post("/report", async (req, res) => {
  const jobKey = (req as any).jobKeyFromApiKey as string | undefined;

  if (!jobKey) {
    return res.status(500).json({
      error: "missing jobKey on request (apiKey middleware not applied)",
    });
  }

  const { status, message } = req.body ?? {};

  if (status !== "ok" && status !== "fail") {
    return res.status(400).json({ error: "invalid payload" });
  }

  const run = await recordRun({ jobKey, status, message });

  if (status === "fail") {
    await sendFailEmail({ jobKey, message });
  }

  return res.status(201).json({ ok: true, run });
});

export default router;
