import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Listen on all interfaces so phones on the LAN can join.
  server: { host: true },
  plugins: [
    react(),
    cloudflare({
      // `pnpm dev:share` opens a Quick Tunnel (*.trycloudflare.com) on start.
      // In plain `pnpm dev`, press `t` + enter to toggle one.
      tunnel: { autoStart: process.env.SHARE === "1" },
    }),
  ],
});
