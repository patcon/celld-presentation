import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],
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
