// Reads what a `celld dev` node keeps in its bucket, which locally is a SQLite
// file of objects. The bucket is celld's source of truth: node leases under
// nodes/, each cell's owner and write log under cells/, deployments under
// deploy/, and R2 objects under r2/<bucket>/.
import { DatabaseSync } from "node:sqlite";

export type BucketCell = { id: string; owner?: string; epoch?: number; logs: number; bytes: number };
export type BucketNode = { name: string; addr?: string; expiresMs?: number; expiresInMs?: number; load?: Record<string, unknown> };

export type Bucket = {
  objects: number;
  bytes: number;
  nodes: BucketNode[];
  cells: BucketCell[];
  deployments: { script: string; current?: string; versions: number }[];
  r2: { bucket: string; objects: number; bytes: number }[];
};

export function readBucket(store: string): Bucket {
  // The running node holds the file's lock, so open it immutable, which skips
  // locking. A fresh connection each time means no stale cached pages.
  const db = new DatabaseSync(`file:${store}?immutable=1`, { readOnly: true });
  try {
    const rows = db.prepare("select key, length(body) as size from objects").all() as { key: string; size: number }[];
    const read = (key: string) => {
      const row = db.prepare("select cast(body as text) as body from objects where key = ?").get(key) as { body: string } | undefined;
      return row && JSON.parse(row.body);
    };

    const cells = new Map<string, BucketCell>();
    const r2 = new Map<string, { bucket: string; objects: number; bytes: number }>();
    const versions = new Map<string, Set<string>>();
    const nodes: BucketNode[] = [];
    for (const { key, size } of rows) {
      const [prefix, name, rest] = key.split("/", 3);
      if (prefix === "cells" && name) {
        const cell = cells.get(name) ?? { id: name, logs: 0, bytes: 0 };
        cells.set(name, cell);
        cell.bytes += size;
        if (key.endsWith("/own.json")) Object.assign(cell, { owner: read(key)?.node, epoch: read(key)?.epoch });
        else if (key.endsWith(".ltx")) cell.logs++;
      } else if (prefix === "nodes" && name?.endsWith(".json")) {
        const lease = read(key);
        nodes.push({ name: lease?.node ?? name.slice(0, -5), addr: lease?.addr, expiresMs: lease?.expires_ms, load: lease?.load });
      } else if (prefix === "deploy" && name && rest && rest !== "current.json") {
        versions.set(name, (versions.get(name) ?? new Set()).add(rest.split("/")[0]));
      } else if (prefix === "r2" && name) {
        const stats = r2.get(name) ?? { bucket: name, objects: 0, bytes: 0 };
        r2.set(name, stats);
        stats.objects++;
        stats.bytes += size;
      }
    }

    return {
      objects: rows.length,
      bytes: rows.reduce((sum, row) => sum + row.size, 0),
      nodes,
      cells: [...cells.values()],
      deployments: [...versions].map(([script, set]) => ({
        script,
        current: read(`deploy/${script}/current.json`)?.version,
        versions: set.size,
      })),
      r2: [...r2.values()],
    };
  } finally {
    db.close();
  }
}
