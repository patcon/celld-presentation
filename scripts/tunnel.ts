// Opens a Quick Tunnel with `wrangler tunnel quick-start`, and once it's
// connected, prints a QR code for its URL so a phone can join without typing.
//
//   node scripts/tunnel.ts [LOCAL_URL]
import { spawn } from "node:child_process";
import QRCode from "qrcode";

const [origin = "http://localhost:5173"] = process.argv.slice(2);
const QUICK_TUNNEL_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

const tunnel = spawn("wrangler", ["tunnel", "quick-start", origin], {
  stdio: ["inherit", "pipe", "pipe"],
});

// cloudflared prints the URL first, then a screenful of diagnostics before the
// tunnel is up, so hold the QR code until it registers, which is quieter too.
let url: string | undefined;
let shown = false;
for (const [stream, out] of [
  [tunnel.stdout, process.stdout],
  [tunnel.stderr, process.stderr],
] as const) {
  stream.on("data", async (chunk: Buffer) => {
    out.write(chunk);
    const text = chunk.toString();
    url ??= text.match(QUICK_TUNNEL_URL)?.[0];
    if (shown || !url || !text.includes("Registered tunnel connection")) return;
    shown = true;
    console.log(`\n${await QRCode.toString(url, { type: "terminal", small: true })}\n  ${url}\n`);
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => tunnel.kill(signal));
tunnel.on("exit", (code) => process.exit(code ?? 0));
