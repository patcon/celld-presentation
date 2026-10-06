// Serves what the running `celld dev` node is doing on a fixed loopback port,
// so the worker can fetch it at /api/celld/state: the node's operator
// `GET /state`, plus what /state doesn't say, like the node's name and what's
// in its bucket. Nothing else is forwarded: the operator API's POST routes
// (shutdown, reload) stay private.
//
//   node scripts/celld-operator.ts [APP_PORT] [PORT]
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { readBucket, type Bucket } from "./celld-bucket.ts";
import { celldVersion, describeNode, type NodeInfo } from "./celld-node.ts";

// PORT must match CELLD_OPERATOR in worker/index.ts.
const [appPort = "5173", port = "5175"] = process.argv.slice(2);

// The names the deck's config gives things, which celld only knows as ids.
const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8").replace(/^\s*\/\/.*$/gm, ""));
const project = {
  name: config.name as string,
  durableObjects: (config.durable_objects?.bindings ?? []) as { name: string; class_name: string }[],
  r2Buckets: (config.r2_buckets ?? []) as { binding: string; bucket_name: string }[],
};
const version = celldVersion();

let node: NodeInfo | undefined;
let bucket: Bucket | undefined;

async function fetchState() {
  // The node gets a new pid and operator port whenever `celld dev` restarts
  // it, so look again after a failure.
  for (const retry of [false, true]) {
    if (retry || !node?.operator) node = describeNode(appPort);
    if (!node?.operator) return undefined;
    try {
      const res = await fetch(`http://${node.operator}/state`);
      if (res.ok) return await res.json();
    } catch {}
    node = undefined;
  }
}

createServer(async (req, res) => {
  if (req.method !== "GET" || req.url !== "/state") {
    res.writeHead(404).end();
    return;
  }
  const state = await fetchState();
  if (!state || !node) {
    res.writeHead(503, { "Content-Type": "application/json" }).end('{"error":"no celld dev node"}');
    return;
  }
  try {
    if (node.store) bucket = readBucket(node.store);
  } catch {
    // A read can catch the store mid-write; keep the last good one until the next poll.
  }
  // Time left on each node's lease, by this machine's clock (the nodes' own), not the viewer's.
  for (const lease of bucket?.nodes ?? []) lease.expiresInMs = lease.expiresMs === undefined ? undefined : lease.expiresMs - Date.now();
  res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ version, node, state, bucket, project }));
}).listen(Number(port), "127.0.0.1", () => {
  console.log(`Serving the celld node's state on http://127.0.0.1:${port}/state`);
});
