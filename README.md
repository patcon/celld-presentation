# celld presentation

An interactive slide deck about [celld](https://celld.dev) and Cloudflare Durable Objects, built on the thing it explains: the deck's state lives in a single Durable Object, and every screen syncs to it over WebSockets.

## Views

| Path             | For                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `/`              | The slides, as a passive display                                    |
| `/present`       | The slides, with ← / → keyboard control                             |
| `/remote`        | Presenter remote: jump to any slide, toggle audience features       |
| `/participation` | Audience phones: emoji reactions, presence, and selfies or a pointer, when enabled |

## Develop

The deck runs on either Wrangler (via the Cloudflare Vite plugin) or [celld](https://celld.dev), both on port 5173 and reachable on your LAN.

```sh
pnpm install

pnpm dev                  # same as wrangler:dev, for now
pnpm wrangler:dev         # Vite dev server with HMR
pnpm wrangler:dev:share   # also opens a public Quick Tunnel, so phones can join over https

pnpm celld:dev            # serve with `celld dev`, rebuilding on change (refresh to see it)
pnpm celld:dev:share      # also opens a Quick Tunnel, and prints a QR code for it

pnpm typecheck
```

Selfies use the camera only over https (or localhost), so test them through the tunnel.

celld keeps its local state (the deck, selfies) in `.celld/dev`; pass `--clean` to `celld dev` to start fresh. It rebuilds the worker itself on change, but it has no HMR and doesn't handle `not_found_handling: "single-page-application"`, so the worker serves the app shell for page routes like `/remote`.

## Slides

Slides are defined in [`src/content.tsx`](src/content.tsx). Code slides use hand-written snippets from [`snippets/`](snippets), highlighted with [Shiki](https://shiki.style) and animated between steps with [Magic Move](https://shiki.style/packages/magic-move). Mark lines with Shiki-style comments: `// [!code ++]`, `--`, `focus` or `highlight` (in JSX, `{/* [!code ++] */}`).

## Deploy

```sh
pnpm wrangler r2 bucket create celld-presentation-selfies   # once
pnpm deploy
```
