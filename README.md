# celld presentation

An interactive slide deck about [celld](https://celld.dev) and Cloudflare Durable Objects, built on the thing it explains: the deck's state lives in a single Durable Object, and every screen syncs to it over WebSockets.

https://github.com/user-attachments/assets/72f05178-f553-4137-b501-132c4b374e98

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
pnpm celld:state          # print the running node's live counters (`GET /state`)

pnpm typecheck
```

Selfies use the camera only over https (or localhost), so test them through the tunnel.

celld keeps its local state (the deck, selfies) in `.celld/dev`; pass `--clean` to `celld dev` to start fresh. It rebuilds the worker itself on change, but it has no HMR and doesn't handle `not_found_handling: "single-page-application"`, so the worker serves the app shell for page routes like `/remote`.

Under `pnpm celld:dev`, the app can read what the celld node is doing from `/api/celld/state` (see [`src/useCelldState.ts`](src/useCelldState.ts)), and the architecture slide draws it live. celld puts its operator API on a random loopback port that changes whenever it restarts the node, so [`scripts/celld-operator.ts`](scripts/celld-operator.ts) finds it and serves `GET /state` on `127.0.0.1:5175`, for the worker to fetch. It adds what `/state` leaves out: the node's name and listeners, and what's in its bucket (node leases, cell owners and write logs, deployments, R2 objects), read from `.celld/dev/objects.sqlite3`. Idle cells are evicted after 10s (`CELLD_IDLE_EVICT_S`), so the Deck can be seen going dormant. Dots beside each database and R2 bucket flash for reads and writes: for the Deck, each `ctx.storage` and R2 call it makes, reported over its WebSockets ([`worker/trace.ts`](worker/trace.ts)); for other cells, a newer transaction showing up in the bucket. Those bucket flashes simplify replication: one flash can stand for several commits, or for the first commit after a cell wakes, and they share the write dot with the Deck's calls. The operator API's other routes (reload, evict, shutdown, …) are listed in [`docs/celld-operator-api.md`](docs/celld-operator-api.md).

## Slides

Slides are defined in [`src/content.tsx`](src/content.tsx). Code slides use hand-written snippets from [`snippets/`](snippets), highlighted with [Shiki](https://shiki.style) and animated between steps with [Magic Move](https://shiki.style/packages/magic-move). Mark lines with Shiki-style comments: `// [!code ++]`, `--`, `focus` or `highlight` (in JSX, `{/* [!code ++] */}`).

## Deploy

```sh
pnpm wrangler r2 bucket create celld-presentation-selfies   # once
pnpm deploy
```
