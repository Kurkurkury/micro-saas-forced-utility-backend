type FailEmailInput = {
  jobKey: string;
  message?: string;
};

/**
 * Safe notifier:
 * - Wenn keine Mail/Webhook-Konfiguration vorhanden ist, wird nur geloggt (kein Crash).
 * - Optional kannst du später einen Webhook aktivieren (z.B. Discord/Slack/Make).
 *
 * ENV optional:
 *   NOTIFY_WEBHOOK_URL=https://...
 */
export async function sendFailEmail(input: FailEmailInput): Promise<void> {
  const text = `[ALERT] jobKey=${input.jobKey}${input.message ? ` message="${input.message}"` : ""}`;

  // 1) Immer loggen (damit du es in Render/Logs siehst)
  console.warn(text);

  // 2) Optional: Webhook (wenn du irgendwann willst)
  const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;

  if (!webhookUrl) {
    // Keine Konfiguration -> bewusst nichts weiter tun
    return;
  }

  try {
    // Node 18+ hat fetch global, bei älteren Umgebungen müsste man es polyfillen.
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        jobKey: input.jobKey,
        message: input.message ?? null,
        ts: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      console.error(`[ALERT] webhook failed status=${res.status}`);
    }
  } catch (err) {
    console.error("[ALERT] webhook error", err);
  }
}
