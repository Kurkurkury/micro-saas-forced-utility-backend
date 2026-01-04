// examples/ping-ack.mjs
// Usage:
//   JOB_URL="http://localhost:3000" JOB_API_KEY="key_..." node examples/ping-ack.mjs
//
// For production (deployed backend):
//   JOB_URL="https://your-host" JOB_API_KEY="key_..." node examples/ping-ack.mjs

const baseUrl = process.env.JOB_URL;
const apiKey = process.env.JOB_API_KEY;

if (!baseUrl) {
  console.error("Missing JOB_URL env var");
  process.exit(1);
}
if (!apiKey) {
  console.error("Missing JOB_API_KEY env var");
  process.exit(1);
}

const url = `${baseUrl.replace(/\/$/, "")}/jobs/ack`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "x-api-key": apiKey,
  },
});

const text = await res.text();

if (!res.ok) {
  console.error(`ACK failed: status=${res.status} body=${text}`);
  process.exit(1);
}

console.log(`ACK ok: status=${res.status} body=${text}`);
