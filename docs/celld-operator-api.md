# celld's operator API

Each celld node has two HTTP listeners:

- **public** (`--listen`): the app, on port 5173 for this deck. It also answers `GET /.well-known/celld/health`.
- **internal** (`--internal-listen`, or `CELLD_INTERNAL_ADDR`): the peer protocol that other nodes use, plus an operator API.

This page covers the operator API, which is on the internal listener. It's checked against celld v0.5.1, the version this deck runs, and against the source at v0.6.1. Both have the same routes. celld calls the API alpha, so a release can change its paths or response formats ([`docs/security.md`](https://github.com/denoland/celld/blob/main/docs/security.md#use-the-internal-operator-api) in the celld repo).

## Finding it under `celld dev`

`celld dev` binds the internal listener to a random port on `127.0.0.1`, and picks a new port each time it restarts the node. It stays on loopback even with `--host 0.0.0.0`, so other machines can't reach it. [`scripts/celld-node.ts`](../scripts/celld-node.ts) finds the port by looking for the node process's other listening port (`findOperator`):

```sh
pnpm celld:state    # GET /state from the dev node, pretty-printed
```

[`scripts/celld-operator.ts`](../scripts/celld-operator.ts) forwards only `GET /state`, on the fixed port `127.0.0.1:5175`, for the worker to serve at `/api/celld/state`. It deliberately forwards none of the routes below that change things.

## Routes

None of these routes authenticate the caller, except `/runtime/`. The only protection is that the listener is on loopback, or on a private network for a real fleet.

| Route | Method | What it does | Response |
| --- | --- | --- | --- |
| `/state` | any | The node's live counters: owned and resident cells, cell phases, RSS, `node_load` (the same sample the node's lease publishes), deployment and isolate pools, allocator stats. | `200` JSON |
| `/reload` | `POST` | Adopts the bucket's current deployment pointer now, without waiting for the next poll. It rebuilds even if the deployment hasn't changed. | `200` `{"ok":true,"outcome":"adopted"\|"unchanged","generation",…}` |
| `/rebalance/pause` | `POST` | Stops cell rebalancing. The node publishes the pause in its lease, and any paused lease stops every move, so this pauses the whole fleet. | `200` `{"rebalance_paused":true}`, or `409` if the node publishes no lease |
| `/rebalance/resume` | `POST` | Undoes a pause made on this node. | `200` `{"rebalance_paused":false}` |
| `/shutdown` | `POST` | Starts a graceful drain: the node stops admitting public requests (`503` with `Retry-After: 1`), hands ownership of its cells to other nodes, then exits. | `200` `{"ok":true}` as soon as the drain starts |
| `/shutdown?handoff=preserve` | `POST` | A drain that keeps the ownership records, to prepare for restarting on the same node. Each stopped database position is uploaded first, then a reload marker is written. Any cold activation in progress is cancelled. | `200` `{"ok":true}` |
| `/evict/<SCOPE>` | any | Evicts a resident cell and waits for the result. A dormant cell keeps its ownership and its hibernated sockets. | `200` `{"ok":true}`; `409`/`503`/`500` `{"ok":false,"error":{"kind","reason"}}` |
| `/cell/<SCOPE>` | any | Resolves a cell, activating it here if this node owns it. | `200` `{"route":"local",…}`, `307` `{"route":"remote","node","addr","epoch",…}`, or `503` |
| `/do/<ID>` | any | Sends a request straight to an ordinary Durable Object, bypassing the Worker. Refuses the reserved runtime classes (D1, Workflows, KV, Queues). | the object's response |
| `/runtime/<SCOPE>` | any | The only way in to those reserved classes, for the operator CLIs (`celld d1`, queues, workflows). Requests must be HMAC-signed with the fleet's peer key. | the class's operator protocol |

The methods marked "any" don't check the method; `/reload`, `/rebalance/*` and `/shutdown` return `405` for anything but `POST`. Any other path returns `404`.

A `SCOPE` is a cell id as `/state` lists it in `residents`, such as `Deck:23a1cc…` for this deck's Deck object.

For example:

```sh
op=$(node -e 'import("./scripts/celld-node.ts").then(m => console.log(m.findOperator("5173")))')
curl -s "http://$op/state" | jq .phases
curl -s "http://$op/evict/Deck:<hex>"     # evict the Deck now, instead of waiting out CELLD_IDLE_EVICT_S
curl -s -X POST "http://$op/reload"
```

## Peer routes, not for operators

The rest of the internal listener carries the peer protocol between nodes: `/peer/probe`, `/peer/handoff`, `/peer/log/{append,seal,tail}`, `/peer/abort/…` and `/peer/tunnel`. These requests are signed. `/peer/probe` returns a signed diagnostic, which `celld diagnose` uses. Nothing else should call them.

## Sources

In the celld repo:

- `handle_internal` in `crates/celld/main.rs`: the route table above.
- `internal_reload`, `internal_rebalance_switch` and `eviction_response` in the same file: what each route returns.
- `docs/security.md` § "Use the internal operator API": the eviction semantics.
- `docs/README.md` § "Shut down and roll out a node": reload, rebalance and the preserve handoff.
