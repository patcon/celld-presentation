import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Listen on all interfaces so phones on the LAN can join.
  server: { host: true },
  plugins: [
    cloudflare({
      // `pnpm dev:share` opens a Quick Tunnel (*.trycloudflare.com) on start.
      // In plain `pnpm dev`, press `t` + enter to toggle one.
      tunnel: { autoStart: process.env.SHARE === "1" },
    }),
  ],
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: { slides: "index.html", remote: "remote.html" },
        },
      },
    },
  },
});
