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

```sh
pnpm install
pnpm dev          # local dev server, reachable on your LAN
pnpm dev:share    # also opens a public Quick Tunnel, so phones can join over https
pnpm typecheck
```

Selfies use the camera only over https (or localhost), so test them through the tunnel.

## Slides

Slides are defined in [`src/content.tsx`](src/content.tsx). Code slides use hand-written snippets from [`snippets/`](snippets), highlighted with [Shiki](https://shiki.style) and animated between steps with [Magic Move](https://shiki.style/packages/magic-move). Mark lines with Shiki-style comments: `// [!code ++]`, `--`, `focus` or `highlight` (in JSX, `{/* [!code ++] */}`).

## Deploy

```sh
pnpm wrangler r2 bucket create celld-presentation-selfies   # once
pnpm deploy
```
