import { useEffect, useState } from "react";

// A few of the counters the celld node's operator `GET /state` reports.
// See https://celld.dev/docs#feed-an-autoscaler for the rest.
export type CelldState = {
  owned_cells: number;
  occupied: number;
  restoring: number;
  residents: string[];
  phases: Record<string, number>;
  rss_bytes: number;
  node_load: { host_websockets: number; resident_cells: number; cpu_percent_x100: number };
  [key: string]: unknown;
};

// Polls the celld node's live state through the worker. It's only there under
// `pnpm celld:dev`, so this is null under wrangler, on Cloudflare, or while
// celld restarts the node.
export function useCelldState(intervalMs = 1000) {
  const [state, setState] = useState<CelldState | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let next: CelldState | null = null;
      try {
        const res = await fetch("/api/celld/state");
        if (res.ok) next = await res.json();
      } catch {}
      if (cancelled) return;
      setState(next);
      timer = setTimeout(poll, intervalMs);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return state;
}
