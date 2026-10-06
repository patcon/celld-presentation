import { useEffect, useState } from "react";

export type IsolatePool = { live: number; heap_bytes: number };

// A few of the counters the celld node's operator `GET /state` reports.
// See https://celld.dev/docs#feed-an-autoscaler for the rest.
export type CelldNodeState = {
  owned_cells: number;
  occupied: number;
  residents: string[];
  phases: Record<string, number>;
  rss_bytes: number;
  node_load: { host_websockets: number; cpu_percent_x100: number };
  deployment?: {
    version: string;
    generation: number;
    // `stateless` is one pool; `cells` and `services` have a pool per script.
    isolates: { stateless?: IsolatePool; cells?: Record<string, IsolatePool>; services?: Record<string, IsolatePool> };
  };
  [key: string]: unknown;
};

// What scripts/celld-operator.ts and the worker add around it: the node's own
// details, what's in its bucket, and the names the deck gives things.
export type CelldView = {
  version?: string;
  node: { name?: string; listen?: string; operator?: string; bucket?: string; idleEvictS?: number };
  state: CelldNodeState;
  bucket?: {
    objects: number;
    bytes: number;
    nodes: { name: string; addr?: string; expiresInMs?: number }[];
    cells: { id: string; owner?: string; epoch?: number; logs: number; bytes: number; latest?: { epoch: number; txid: number } }[];
    deployments: { script: string; current?: string; versions: number }[];
    r2: { bucket: string; objects: number; bytes: number }[];
  };
  project: {
    name: string;
    durableObjects: { name: string; class_name: string }[];
    r2Buckets: { binding: string; bucket_name: string }[];
  };
  names: Record<string, string>;
};

// Polls the celld node's live state through the worker. It's only there under
// `pnpm celld:dev`, so this is null under wrangler, on Cloudflare, or while
// celld restarts the node.
export function useCelldState(intervalMs = 1000) {
  const [view, setView] = useState<CelldView | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let next: CelldView | null = null;
      try {
        const res = await fetch("/api/celld/state");
        // An older scripts/celld-operator.ts (still running from before a restart) sends just /state.
        const body = res.ok && (await res.json());
        if (body?.state && body?.node) next = body;
      } catch {}
      if (cancelled) return;
      setView(next);
      timer = setTimeout(poll, intervalMs);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return view;
}
