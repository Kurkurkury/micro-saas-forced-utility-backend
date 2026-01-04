import { Router } from "express";
import { createApiKey, listApiKeys, revokeApiKey } from "../db/apiKeys.js";

const router = Router();

/**
 * GET /api-keys
 * Admin-only (via x-admin-key middleware)
 * Gibt NIE den vollen Key zurück, nur Prefix + Metadaten
 */
router.get("/", async (_req, res) => {
  const keys = await listApiKeys();
  return res.json({ keys });
});

/**
 * POST /api-keys
 * Body:
 * {
 *   "jobKey": "string"
 * }
 *
 * Wichtig:
 * - Der volle Key wird NUR in dieser Response einmalig zurückgegeben.
 * - Speichere ihn direkt beim Client, sonst ist er später nicht mehr sichtbar.
 */
router.post("/", async (req, res) => {
  const { jobKey } = req.body ?? {};

  if (typeof jobKey !== "string" || jobKey.trim().length === 0) {
    return res.status(400).json({ error: "invalid payload" });
  }

  const created = await createApiKey(jobKey.trim());

  return res.status(201).json({
    ok: true,
    apiKey: {
      key: created.key, // einmalig!
      jobKey: created.jobKey,
      keyPrefix: created.keyPrefix,
    },
  });
});

/**
 * POST /api-keys/:id/revoke
 * Admin-only
 */
router.post("/:id/revoke", async (req, res) => {
  const { id } = req.params;

  if (typeof id !== "string" || id.trim().length === 0) {
    return res.status(400).json({ error: "invalid id" });
  }

  await revokeApiKey(id.trim());
  return res.json({ ok: true });
});

export default router;
