import { useEffect, useLayoutEffect, useRef } from "react";
import { useCelldState, type CelldView } from "../useCelldState";
import { registerAnchor } from "../tether";
import { onDeckMessage, useDeckSockets } from "../useDeck";
import type { SocketRole } from "../../shared/protocol";

// How a cell (one Durable Object instance) is doing, in celld's own terms.
// celld reports `resident` (in memory) and `dormant` (evicted from memory,
// hibernatable WebSockets kept); anything else is a cell part-way between
// them, like `activating` or `evicting`. A cell no live node owns is only in the bucket.
type Look = "resident" | "dormant" | "changing" | "inactive";

const LEGEND: [Look, string, string][] = [
  ["resident", "resident", "in memory"],
  ["dormant", "dormant", "hibernated, sockets kept"],
  ["changing", "activating…", "waking or evicting"],
  ["inactive", "inactive", "only in the bucket"],
];

type CellView = { id: string; cls: string; label: string; stub?: string; phase: string; look: Look; detail: string };

const MB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const shortId = (id: string) => `${id.slice(0, 8)}…`;

// /state names the resident cells, but only counts the rest by phase, so the
// non-resident cells this node owns take those phases in turn (exact while it
// owns one, as this deck's node does).
function cellsOf(view: CelldView, nodeName: string | undefined): CellView[] {
  const { state, bucket, names, project } = view;
  const owned = (bucket?.cells ?? []).filter((cell) => cell.owner === nodeName);
  for (const id of state.residents) if (!owned.some((cell) => cell.id === id)) owned.push({ id, logs: 0, bytes: 0 });
  const pending = Object.entries(state.phases)
    .filter(([phase]) => phase !== "resident")
    .sort(([a], [b]) => Number(a === "dormant") - Number(b === "dormant"))
    .flatMap(([phase, count]) => Array<string>(count).fill(phase));
  return owned
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((cell) => {
      const [cls, hex = ""] = cell.id.split(":");
      const binding = project.durableObjects.find((d) => d.class_name === cls)?.name;
      const phase = state.residents.includes(cell.id) ? "resident" : (pending.shift() ?? "not in memory");
      const look: Look = phase === "resident" ? "resident" : phase === "dormant" ? "dormant" : phase === "not in memory" ? "inactive" : "changing";
      const name = names[cell.id];
      const label = name ? `name "${name}"` : shortId(hex);
      // How the Worker addresses it: the stub it gets from the binding.
      const stub = binding && (name ? `env.${binding}.getByName("${name}")` : `env.${binding}.get(${shortId(hex)})`);
      const detail = [cell.epoch !== undefined && `epoch ${cell.epoch}`, cell.logs && `${cell.logs} log files`].filter(Boolean).join(" · ");
      return { id: cell.id, cls, label, stub, phase, look, detail };
    });
}

function CellBox({ cell, x, y }: { cell: CellView; x: number; y: number }) {
  return (
    <g className={`cell cell-${cell.look}`} transform={`translate(${x} ${y})`}>
      <rect width="300" height="118" rx="12" />
      <text x="16" y="30" className="cell-name start">
        {cell.cls}
      </text>
      <text x="284" y="30" className="cell-phase end">
        {cell.phase}
      </text>
      <text x="16" y="58" className="cell-label start">
        {cell.label}
      </text>
      <text x="16" y="84" className="cell-detail start">
        {cell.detail}
      </text>
      <text x="16" y="106" className="cell-id start">
        {cell.id.length > 34 ? `${cell.id.slice(0, 34)}…` : cell.id}
      </text>
    </g>
  );
}

// The cells' top edge, with a channel above it, below the worker, for the sockets.
const CELL_TOP = 336;

const socketPath = (x: number, y: number, port: number) => `M${x} ${y + 13} C ${x} 115, ${port} 105, ${port} 156`;

// Dots fill in from the right: slides screens first, as they come and go least,
// so the audience's dots after them don't shuffle along every time one does.
const ROLE_ORDER: SocketRole[] = ["screen", "audience", "other"];

const SVG_NS = "http://www.w3.org/2000/svg";
const ZAP_SPEED = 2.6; // diagram units per ms
const ZAP_GAP_MS = 100; // per socket, so a stream of pointer moves reads as a pulse
// The comet: a bright head, then a streak of overlapping sparks tapering away
// behind it. The streak is a few frames' travel long, so frame to frame it
// overlaps itself and reads as one continuous trail rather than hops.
const TAIL = 110;
const SPARKS = 14;
const COMET = Array.from({ length: SPARKS }, (_, k) => ({
  behind: (k / (SPARKS - 1)) * TAIL,
  r: 11 * (1 - 0.75 * (k / SPARKS)),
  opacity: (1 - k / SPARKS) ** 1.6,
}));
// Mostly constant speed, easing off a little as it lands.
const glide = (t: number) => 0.7 * t + 0.3 * (1 - (1 - t) ** 2);

// A packet zipping along a socket, client to cell, for each message this screen
// hears that someone else's message caused. It follows the live line and hop,
// so it stays on the wire even while an avatar tugs the dot, and lands with a ring.
function useZaps(layer: React.RefObject<SVGGElement | null>) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const last = new Map<string, number>();

    const spark = (tag: string, attrs: Record<string, string | number>) => {
      const el = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      return el;
    };

    const land = (x: number, y: number) => {
      const ring = spark("circle", { class: "zap-ring", cx: x, cy: y, r: 7 });
      layer.current?.append(ring);
      ring
        .animate(
          [
            { transform: "scale(0.4)", opacity: 1 },
            { transform: "scale(2.2)", opacity: 0 },
          ],
          { duration: 320, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
        )
        .finished.finally(() => ring.remove());
    };

    const zap = (dot: Element) => {
      const i = dot.getAttribute("data-index");
      const now = performance.now();
      if (now - (last.get(i ?? "") ?? 0) < ZAP_GAP_MS) return;
      last.set(i ?? "", now);
      const line = dot.querySelector<SVGPathElement>("path.socket");
      const hop = layer.current?.ownerSVGElement?.querySelector<SVGPathElement>(`path.socket-hop[data-index="${i}"]`);
      if (!line || !layer.current) return;

      const comet = spark("g", { class: "zap" });
      // Head last, so it draws over its tail.
      const sparks = [...COMET].reverse().map(({ r, opacity, behind }) => {
        const el = spark("circle", { r, opacity, fill: "url(#zap-glow)", visibility: "hidden" });
        comet.append(el);
        return { el, behind };
      });
      layer.current.append(comet);

      const at = (distance: number, toLine: number) =>
        distance <= toLine || !hop ? line.getPointAtLength(distance) : hop.getPointAtLength(distance - toLine);
      const start = performance.now();
      let landed = false;
      const frame = (now: number) => {
        const toLine = line.getTotalLength();
        const total = toLine + (hop?.getTotalLength() ?? 0);
        // The head runs on past the end by a tail's length, so the trail drains into the cell.
        const t = Math.min((now - start) / ((total + TAIL) / ZAP_SPEED), 1);
        const head = (total + TAIL) * glide(t);
        for (const { el, behind } of sparks) {
          const d = head - behind;
          // Sparks not yet out of the dot, or already into the cell, don't show.
          el.style.visibility = d < 0 || d > total ? "hidden" : "visible";
          if (d < 0 || d > total) continue;
          const p = at(d, toLine);
          el.setAttribute("cx", String(p.x));
          el.setAttribute("cy", String(p.y));
        }
        if (!landed && head >= total) {
          landed = true;
          const end = at(total, toLine);
          land(end.x, end.y);
        }
        if (t < 1) requestAnimationFrame(frame);
        else comet.remove();
      };
      requestAnimationFrame(frame);
    };

    return onDeckMessage((msg) => {
      const from = "from" in msg ? msg.from : undefined;
      const via = "via" in msg ? msg.via : undefined;
      const svg = layer.current?.ownerSVGElement;
      if (!from || !svg) return;
      // The socket it came in on, as a client's tabs share its id; else (from an
      // older Deck) the first of that client's.
      const dots = [...svg.querySelectorAll("g[data-index]")];
      const sender =
        (via && dots.find((dot) => dot.getAttribute("data-conn") === via)) ||
        dots.find((dot) => dot.getAttribute("data-client") === from);
      if (sender) zap(sender);
    });
  }, [layer]);
}

// Beside a SQLite database or R2 bucket: a dot that flashes blue for each
// read a cell makes on it, and one beside it that flashes amber for each
// write. `target` is the cell's id for a database, or the binding's name for
// an R2 bucket.
const IO_COLORS = { read: "#3b82f6", write: "#f59e0b" } as const;
type IoKind = keyof typeof IO_COLORS;

function IoDots({ x, y, store, target }: { x: number; y: number; store: "sqlite" | "r2"; target: string }) {
  return (
    <>
      {(["read", "write"] as const).map((kind, i) => (
        <circle key={kind} className="io-dot" cx={x - 14 + i * 14} cy={y} r="5" data-store={store} data-target={target} data-io={kind} />
      ))}
    </>
  );
}

function IoLegend({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {(["read", "write"] as const).map((kind, i) => (
        <g key={kind} transform={`translate(${i * 70} 0)`}>
          <circle cy="-5" r="5" fill={IO_COLORS[kind]} />
          <text x="10" className="caption start">
            {kind}
          </text>
        </g>
      ))}
    </g>
  );
}

function flash(dot: SVGCircleElement, kind: IoKind) {
  // A newer call restarts the flash, so a burst of them doesn't pile up.
  dot.getAnimations().forEach((animation) => animation.cancel());
  const fill = IO_COLORS[kind];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  dot.animate(
    [
      { fill, opacity: 1, transform: still ? "none" : "scale(1.7)" },
      { fill, opacity: 1, transform: "none", offset: 0.3 },
      { opacity: 0.35, transform: "none" },
    ],
    { duration: 700, easing: "ease-out" },
  );
}

const ioDot = (svg: SVGSVGElement | null, store: "sqlite" | "r2", target: string | undefined, kind: IoKind) =>
  svg?.querySelector<SVGCircleElement>(`.io-dot[data-store="${store}"][data-target="${target}"][data-io="${kind}"]`);

// Flashes the calls a traced cell reports as it makes them.
function useIoFlashes(svg: React.RefObject<SVGSVGElement | null>) {
  useEffect(
    () =>
      onDeckMessage((msg) => {
        if (msg.type !== "trace") return;
        for (const event of msg.events) {
          const kind: IoKind = event.write ? "write" : "read";
          const dot = ioDot(svg.current, event.store, event.store === "r2" ? event.binding : event.cell, kind);
          if (dot) flash(dot, kind);
        }
      }),
    [svg],
  );
}

// A cell that doesn't report its calls only shows up in the bucket, so flash
// its database's write dot when a newer transaction lands there: a commit,
// seen up to a poll late, rather than each call.
//
// This simplifies replication on purpose. One flash stands for whatever
// changed the newest epoch and transaction between two polls: several
// commits, or the first commit of a new epoch after the cell woke. It's the
// same dot as a write call, though it's a different event, and snapshots and
// whatever else celld writes for a cell don't show at all.
function useCommitFlashes(svg: React.RefObject<SVGSVGElement | null>, view: CelldView | null) {
  const seen = useRef<Map<string, string>>(undefined);
  useEffect(() => {
    if (!view?.bucket) return;
    // The first poll only sets where each database starts from; after that, a
    // database new to the bucket flashes for its first transaction too.
    const first = !seen.current;
    seen.current ??= new Map();
    for (const cell of view.bucket.cells) {
      const [cls, hex = ""] = cell.id.split(":");
      const latest = cell.latest && `${cell.latest.epoch}:${cell.latest.txid}`;
      const before = seen.current.get(cell.id);
      if (latest) seen.current.set(cell.id, latest);
      if (first || !latest || before === latest || view.traced?.includes(cls)) continue;
      const dot = ioDot(svg.current, "sqlite", hex, "write");
      if (dot) flash(dot, "write");
    }
  }, [svg, view]);
}

// A client at the far end of one of the node's sockets, tagged with its client
// id. For an audience member, src/tether.ts pulls their presence circle over to
// it, and moves it (and its line) as the two meet. A slides screen gets a screen icon.
function ClientDot({
  index,
  id,
  conn,
  role,
  x,
  port,
}: {
  index: number;
  id?: string;
  conn?: string;
  role?: SocketRole;
  x: number;
  port: number;
}) {
  const circle = useRef<SVGCircleElement>(null);
  const line = useRef<SVGPathElement>(null);

  useLayoutEffect(() => {
    if (!id || role !== "audience") return;
    const move = (dx: number, dy: number) => {
      circle.current?.setAttribute("cx", String(x + dx));
      circle.current?.setAttribute("cy", String(50 + dy));
      line.current?.setAttribute("d", socketPath(x + dx, 50 + dy, port));
    };
    const unregister = registerAnchor(id, {
      home() {
        const m = circle.current?.ownerSVGElement?.getScreenCTM();
        return m ? { x: m.a * x + m.e, y: m.d * 50 + m.f, scale: m.a } : null;
      },
      apply: move,
    });
    return () => {
      unregister();
      move(0, 0);
    };
  }, [id, role, x, port]);

  return (
    <g data-index={index} data-client={id} data-conn={conn} data-role={role}>
      <path ref={line} className="socket" d={socketPath(x, 50, port)} />
      <circle ref={circle} className="client" cx={x} cy="50" r="13" />
      {role === "screen" && (
        <path className="screen-icon" transform={`translate(${x} 50)`} d="M-7 -6 H7 V3 H-7 Z M0 3 V7 M-4 7 H4" />
      )}
    </g>
  );
}

// The deck's own celld fleet, as it is right now: its node, the cells that node
// owns, and the bucket behind them, polled from the node while running under
// `pnpm celld:dev`.
export function FleetDiagram() {
  const view = useCelldState();
  // celld only counts sockets; the Deck says whose each is, and the dots take them in turn.
  const zaps = useRef<SVGGElement>(null);
  useZaps(zaps);
  const fleet = useRef<SVGSVGElement>(null);
  useIoFlashes(fleet);
  useCommitFlashes(fleet, view);
  const roster = [...useDeckSockets()].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  if (!view) {
    return (
      <svg className="fleet" viewBox="0 0 1200 720" role="img" aria-label="celld state unavailable">
        <rect className="fleet-frame" x="20" y="20" width="1160" height="680" rx="16" />
        <text x="600" y="350" className="node-name">
          No celld node to show
        </text>
        <text x="600" y="385" className="caption">
          Run the deck with `pnpm celld:dev` to see its fleet, live.
        </text>
      </svg>
    );
  }

  const { version, node, state, bucket, project } = view;
  const leases = bucket?.nodes ?? [];
  const live = leases.filter((lease) => (lease.expiresInMs ?? 0) > 0);
  const lease = leases.find((l) => l.name === node.name);
  const cells = cellsOf(view, node.name);
  const sockets = state.node_load.host_websockets;
  // /state only counts the node's sockets, so they all go to the cell the deck
  // gets by name (the only one that accepts WebSockets), or else the one cell in memory.
  const shown = cells.slice(0, 3);
  const socketCell = Math.max(
    shown.findIndex((cell) => view.names[cell.id]),
    shown.findIndex((cell) => cell.look !== "inactive"),
  );
  // Each socket enters the node through its own port by the node's top-right
  // corner, runs down past the worker and along the channel above the cells,
  // and drops into its own port by the cell's top-right corner. The rightmost
  // socket turns lowest and lands rightmost, so none of them cross.
  const n = Math.min(sockets, 14);
  const lane = Math.min(34, 80 / Math.max(1, n - 1));
  const cellRight = 60 + socketCell * 330 + 300;
  const clients = Array.from({ length: n }, (_, i) => ({
    x: 1140 - i * 34,
    port: 1140 - i * lane,
    channel: CELL_TOP - 16 - i * Math.min(8, 24 / Math.max(1, n - 1)),
    landing: cellRight - 20 - i * lane,
  }));
  const isolates = state.deployment?.isolates;
  const cellPool = isolates?.cells?.[project.name];
  const deployment = bucket?.deployments.find((d) => d.script === project.name);

  const nodeLine = [
    `RSS ${MB(state.rss_bytes)}`,
    `CPU ${(state.node_load.cpu_percent_x100 / 100).toFixed(1)}%`,
    node.idleEvictS && `evicts idle cells after ${node.idleEvictS}s`,
    lease?.expiresInMs !== undefined && `lease expires in ${Math.max(0, Math.ceil(lease.expiresInMs / 1000))}s unless renewed`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <svg ref={fleet} className="fleet" viewBox="0 0 1200 720" role="img" aria-label={`celld fleet: node ${node.name}, ${cells.length} cells`}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="context-stroke" />
        </marker>
        {/* A packet's glow: a white-hot core fading out through amber, no filter needed. */}
        <radialGradient id="zap-glow">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Clients: one dot per WebSocket the node holds open, each connected to the node itself. */}
      {clients.map(({ x, port }, i) => (
        <ClientDot key={i} index={i} id={roster[i]?.id} conn={roster[i]?.conn} role={roster[i]?.role} x={x} port={port} />
      ))}
      <text x="1160" y="92" className="caption end halo">
        {sockets === 0 ? "no WebSockets open" : `${sockets} WebSocket${sockets === 1 ? "" : "s"} open${sockets > 14 ? " (14 shown)" : ""}`}
      </text>

      {/* Legend */}
      <g className="legend" transform="translate(40 22)">
        {LEGEND.map(([look, name, label], i) => (
          <g key={look} className={`cell cell-${look}`} transform={`translate(${(i % 2) * 280} ${Math.floor(i / 2) * 44})`}>
            <rect width="28" height="28" rx="6" />
            <text x="38" y="20" className="legend-label start">
              <tspan className="legend-state">{name}</tspan> {label}
            </text>
          </g>
        ))}
      </g>

      {/* The fleet, as the bucket's node leases describe it. */}
      <rect className="fleet-frame" x="20" y="140" width="1160" height="340" rx="16" />
      <text x="36" y="130" className="caption start">
        fleet · {live.length} live node{live.length === 1 ? "" : "s"}
        {leases.length > live.length ? ` (+${leases.length - live.length} expired)` : ""} · celld {version}
      </text>
      <rect className="node" x="40" y="156" width="1120" height="308" rx="12" />
      <text x="60" y="190" className="node-name start">
        node {node.name}
      </text>
      <text x="1040" y="190" className="caption end">
        listen {node.listen} · operator {node.operator}
      </text>
      <text x="60" y="214" className="caption start">
        {nodeLine}
      </text>

      {/* Each stub, from its chip in the Worker down to the cell it addresses.
          Drawn first, so the sockets pass over them. */}
      {shown.map(
        (cell, i) =>
          cell.stub && <path key={cell.id} className="stub-call" d={`M${100 + i * 330} 282 V ${CELL_TOP - 2}`} markerEnd="url(#arrow)" />,
      )}

      {/* The node holds each socket and hands its frames to the cell, which
          sleeps through them while it hibernates (and wakes on the next one). */}
      {socketCell >= 0 &&
        clients.map(({ port, channel, landing }, i) => (
          <path
            key={i}
            data-index={i}
            className={`socket-hop hop-${shown[socketCell].look}`}
            d={`M${port} 156 V ${channel - 8} Q ${port} ${channel}, ${port - 8} ${channel} H ${landing + 8} Q ${landing} ${channel}, ${landing} ${channel + 8} V ${CELL_TOP}`}
          />
        ))}
      {clients.map(({ port }, i) => (
        <rect key={i} className="port" x={port - 4} y="152" width="8" height="8" rx="2" />
      ))}

      <rect className="worker" x="60" y="228" width="980" height="62" rx="8" />
      <text x="76" y="250" className="worker-label start">
        Worker {project.name} · deployment {state.deployment?.version.slice(0, 8) ?? "?"} (generation {state.deployment?.generation ?? "?"})
      </text>
      <text x="1024" y="250" className="worker-label end">
        isolates: {isolates?.stateless?.live ?? 0} stateless · {cellPool?.live ?? 0} cell{cellPool ? `, ${MB(cellPool.heap_bytes)} heap` : ""}
      </text>

      {/* A stub is the Worker's handle on a cell: getByName() makes one
          without contacting the cell, and calls on it (fetch() or RPC) go
          to wherever that cell lives. */}
      {shown.map(
        (cell, i) =>
          cell.stub && (
            <g key={cell.id}>
              <rect className="stub" x={76 + i * 330} y="260" width="268" height="22" rx="4" />
              <text x={88 + i * 330} y="276" className="stub-label start">
                {cell.stub}
              </text>
            </g>
          ),
      )}

      {cells.length === 0 ? (
        <text x="600" y="360" className="caption">
          no cells yet: this node owns no Durable Objects
        </text>
      ) : (
        shown.map((cell, i) => <CellBox key={cell.id} cell={cell} x={60 + i * 330} y={CELL_TOP} />)
      )}
      {socketCell >= 0 &&
        clients.map(({ landing }, i) => (
          <rect key={i} className="port" x={landing - 4} y={CELL_TOP - 4} width="8" height="8" rx="2" />
        ))}
      {cells.length > 3 && (
        <text x="1140" y="458" className="caption end">
          +{cells.length - 3} more cells
        </text>
      )}

      {/* The bucket: celld's source of truth, where any node can pick a cell up. */}
      <path className="sync" d="M600 466 V 528" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x="612" y="505" className="caption start">
        replicates writes · restores on wake
      </text>
      <path className="bucket" d="M60 540 V 680 A 540 26 0 0 0 1140 680 V 540" />
      <ellipse className="bucket" cx="600" cy="540" rx="540" ry="26" />
      <text x="600" y="584" className="bucket-name">
        bucket {node.bucket}
      </text>
      <text x="600" y="608" className="caption">
        {bucket ? `${bucket.objects} objects · ${MB(bucket.bytes)}` : "contents unavailable"}
      </text>
      {/* Each cell's SQLite database, on the left, and the rest of the bucket on
          the right. Dots beside them flash for each read and write the Deck
          makes on a database or R2 bucket (see worker/trace.ts). */}
      {bucket && <IoLegend x={960} y={608} />}
      {bucket?.cells.slice(0, 2).map((cell, i) => {
        const [cls, hex = ""] = cell.id.split(":");
        const at = cell.latest ? ` · epoch ${cell.latest.epoch}, txn ${cell.latest.txid}` : "";
        const live = leases.some((l) => l.name === cell.owner && (l.expiresInMs ?? 0) > 0);
        // The cell this database belongs to, in the look of its box in the
        // node; a cell no node here owns is only in the bucket.
        const look = cells.find((owned) => owned.id === cell.id)?.look ?? "inactive";
        return (
          <g key={cell.id} className={live ? undefined : "bucket-row-inactive"}>
            <g className={`cell cell-${look}`}>
              <rect x="72" y={626 + i * 26} width="18" height="18" rx="4" />
            </g>
            <IoDots x={116} y={635 + i * 26} store="sqlite" target={hex} />
            <text x="130" y={640 + i * 26} className="bucket-chip start">
              cells/{cls}:{shortId(hex)} · SQLite{at}
            </text>
          </g>
        );
      })}
      {bucket && bucket.cells.length > 2 && (
        <text x="130" y="692" className="bucket-chip start">
          +{bucket.cells.length - 2} more databases
        </text>
      )}
      {bucket &&
        [
          { text: `nodes/ · ${leases.length} lease${leases.length === 1 ? "" : "s"}`, binding: undefined },
          { text: `deploy/ · ${deployment?.versions ?? 0} versions`, binding: undefined },
          ...project.r2Buckets.map(({ binding, bucket_name }) => {
            const n = bucket.r2.find((r) => r.bucket === bucket_name)?.objects ?? 0;
            return { text: `r2/${bucket_name} · ${n} object${n === 1 ? "" : "s"}`, binding };
          }),
        ].map(({ text, binding }, i) => (
          <g key={text}>
            {binding && <IoDots x={646} y={635 + i * 26} store="r2" target={binding} />}
            <text x="660" y={640 + i * 26} className="bucket-chip start">
              {text}
            </text>
          </g>
        ))}

      {/* Over everything, so a zap shows along the whole route. */}
      <g ref={zaps} />
    </svg>
  );
}
