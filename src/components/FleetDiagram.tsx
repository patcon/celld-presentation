import { useCelldState, type CelldView } from "../useCelldState";

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

type CellView = { id: string; cls: string; label: string; phase: string; look: Look; detail: string };

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
      const label = names[cell.id] && binding ? `env.${binding}.getByName("${names[cell.id]}")` : shortId(hex);
      const detail = [cell.epoch !== undefined && `epoch ${cell.epoch}`, cell.logs && `${cell.logs} log files`].filter(Boolean).join(" · ");
      return { id: cell.id, cls, label, phase, look, detail };
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

// The deck's own celld fleet, as it is right now: its node, the cells that node
// owns, and the bucket behind them, polled from the node while running under
// `pnpm celld:dev`.
export function FleetDiagram() {
  const view = useCelldState();
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
  const inactive = (bucket?.cells ?? []).filter((cell) => !live.some((l) => l.name === cell.owner)).length;
  const sockets = state.node_load.host_websockets;
  // /state only counts the node's sockets, so they all go to the cell the deck
  // gets by name (the only one that accepts WebSockets), or else the one cell in memory.
  const shown = cells.slice(0, 3);
  const socketCell = Math.max(
    shown.findIndex((cell) => view.names[cell.id]),
    shown.findIndex((cell) => cell.look !== "inactive"),
  );
  // Each socket enters the node through its own port in a lane down the node's
  // right edge, clear of its text, and turns into the cell's side.
  const n = Math.min(sockets, 14);
  const lane = Math.min(34, 80 / Math.max(1, n - 1));
  const clients = Array.from({ length: n }, (_, i) => ({
    x: 1140 - i * 34,
    port: 1140 - i * lane,
    landing: 400 - i * (82 / Math.max(1, n - 1)),
  }));
  const cellSide = 60 + socketCell * 330 + 300;
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
    <svg className="fleet" viewBox="0 0 1200 720" role="img" aria-label={`celld fleet: node ${node.name}, ${cells.length} cells`}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="context-stroke" />
        </marker>
      </defs>

      {/* Clients: one dot per WebSocket the node holds open, each connected to the node itself. */}
      {clients.map(({ x, port }, i) => (
        <g key={i}>
          <path className="socket" d={`M${x} 63 C ${x} 115, ${port} 105, ${port} 156`} />
          <circle className="client" cx={x} cy="50" r="13" />
        </g>
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

      {/* The node holds each socket and hands its frames to the cell, which
          sleeps through them while it hibernates (and wakes on the next one). */}
      {socketCell >= 0 &&
        clients.map(({ port, landing }, i) => (
          <path
            key={i}
            className={`socket-hop hop-${shown[socketCell].look}`}
            d={`M${port} 156 V ${landing - 16} Q ${port} ${landing}, ${port - 16} ${landing} H ${cellSide}`}
          />
        ))}
      {clients.map(({ port }, i) => (
        <rect key={i} className="port" x={port - 4} y="152" width="8" height="8" rx="2" />
      ))}

      <rect className="worker" x="60" y="228" width="980" height="44" rx="8" />
      <text x="76" y="256" className="worker-label start">
        Worker {project.name} · deployment {state.deployment?.version.slice(0, 8) ?? "?"} (generation {state.deployment?.generation ?? "?"})
      </text>
      <text x="1024" y="256" className="worker-label end">
        isolates: {isolates?.stateless?.live ?? 0} stateless · {cellPool?.live ?? 0} cell{cellPool ? `, ${MB(cellPool.heap_bytes)} heap` : ""}
      </text>

      {cells.length === 0 ? (
        <text x="600" y="360" className="caption">
          no cells yet: this node owns no Durable Objects
        </text>
      ) : (
        shown.map((cell, i) => <CellBox key={cell.id} cell={cell} x={60 + i * 330} y={300} />)
      )}
      {cells.length > 0 && <path className="flow" d="M210 272 V 298" markerEnd="url(#arrow)" />}
      {cells.length > 3 && (
        <text x="1140" y="448" className="caption end">
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
      <text x="600" y="592" className="bucket-name">
        bucket {node.bucket}
      </text>
      <text x="600" y="618" className="caption">
        {bucket ? `${bucket.objects} objects · ${MB(bucket.bytes)}` : "contents unavailable"}
      </text>
      {bucket &&
        [
          `nodes/ · ${leases.length} lease${leases.length === 1 ? "" : "s"}`,
          `cells/ · ${bucket.cells.length} cell${bucket.cells.length === 1 ? "" : "s"}${inactive ? `, ${inactive} inactive` : ""}`,
          `deploy/ · ${deployment?.versions ?? 0} versions`,
          ...project.r2Buckets.map(({ bucket_name }) => {
            const n = bucket.r2.find((r) => r.bucket === bucket_name)?.objects ?? 0;
            return `r2/${bucket_name} · ${n} object${n === 1 ? "" : "s"}`;
          }),
        ].map((chip, i) => (
          <text key={chip} x={i % 2 ? 870 : 330} y={650 + Math.floor(i / 2) * 26} className="bucket-chip">
            {chip}
          </text>
        ))}
    </svg>
  );
}
