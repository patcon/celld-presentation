import { rmSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// celld refuses to serve assets when an .assetsignore is present, and the
// Cloudflare plugin writes one on every build, so drop it for celld builds.
const celldAssets = (): Plugin => ({
  name: "celld-assets",
  apply: "build",
  closeBundle() {
    if (process.env.CELLD === "1") rmSync("dist/client/.assetsignore", { force: true });
  },
});

export default defineConfig({
  // Listen on all interfaces so phones on the LAN can join.
  server: { host: true },
  plugins: [
    react(),
    cloudflare({
      // `pnpm wrangler:dev:share` opens a Quick Tunnel (*.trycloudflare.com) on start.
      // In plain `pnpm wrangler:dev`, press `t` + enter to toggle one.
      tunnel: { autoStart: process.env.SHARE === "1" },
    }),
    celldAssets(),
  ],
});
