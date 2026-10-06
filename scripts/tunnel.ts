// Opens a Quick Tunnel with `wrangler tunnel quick-start`, and once its URL
// shows up, prints a QR code for it so a phone can join without typing.
//
//   node scripts/tunnel.ts [LOCAL_URL]
import { spawn } from "node:child_process";
import QRCode from "qrcode";

const [origin = "http://localhost:5173"] = process.argv.slice(2);
const QUICK_TUNNEL_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

const tunnel = spawn("wrangler", ["tunnel", "quick-start", origin], {
  stdio: ["inherit", "pipe", "pipe"],
});

let shown = false;
for (const [stream, out] of [
  [tunnel.stdout, process.stdout],
  [tunnel.stderr, process.stderr],
] as const) {
  stream.on("data", async (chunk: Buffer) => {
    out.write(chunk);
    const match = !shown && chunk.toString().match(QUICK_TUNNEL_URL);
    if (!match) return;
    shown = true;
    console.log(`\n${await QRCode.toString(match[0], { type: "terminal", small: true })}\n  ${match[0]}\n`);
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => tunnel.kill(signal));
tunnel.on("exit", (code) => process.exit(code ?? 0));
