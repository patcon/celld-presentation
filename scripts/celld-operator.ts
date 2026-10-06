// Serves the `celld dev` node's operator `GET /state` on a fixed loopback port,
// so the worker can fetch it at /api/celld/state. Only that one read-only route
// is forwarded: the operator API's POST routes (shutdown, reload) stay private.
//
//   node scripts/celld-operator.ts [APP_PORT] [PORT]
import { createServer } from "node:http";
import { findOperator } from "./celld-node.ts";

// PORT must match CELLD_OPERATOR in worker/index.ts.
const [appPort = "5173", port = "5175"] = process.argv.slice(2);

let operator: string | undefined;

async function fetchState() {
  // A cached port goes stale whenever `celld dev` restarts the node, so look again after a failure.
  for (const retry of [false, true]) {
    if (retry || !operator) operator = findOperator(appPort);
    if (!operator) return undefined;
    try {
      return await fetch(`http://${operator}/state`);
    } catch {
      operator = undefined;
    }
  }
}

createServer(async (req, res) => {
  if (req.method !== "GET" || req.url !== "/state") {
    res.writeHead(404).end();
    return;
  }
  const state = await fetchState();
  if (!state) {
    res.writeHead(503, { "Content-Type": "application/json" }).end('{"error":"no celld dev node"}');
    return;
  }
  res.writeHead(state.status, { "Content-Type": "application/json" }).end(await state.text());
}).listen(Number(port), "127.0.0.1", () => {
  console.log(`Forwarding the celld operator's /state on http://127.0.0.1:${port}/state`);
});
