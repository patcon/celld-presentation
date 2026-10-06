import { useCelldState, type CelldState } from "../useCelldState";

// The states a cell (one Durable Object instance) moves through, as celld's docs name them.
type CellState = "active" | "idle" | "hibernated" | "inactive";

const LEGEND: [CellState, string][] = [
  ["active", "doing work"],
  ["idle", "waiting, in memory"],
  ["hibernated", "evicted, sockets kept"],
  ["inactive", "only in the bucket"],
];

type Cell = { name: string; state: CellState; live?: boolean };

// An illustrative fleet: three nodes, a few cells each. This deck's own Deck cell
// is on node 1 (next to node 2, where the request comes in), and shows its real state when the app runs under `pnpm celld:dev`.
const nodes = (deck: Cell): Cell[][] => [
  [{ name: "Room:a1", state: "idle" }, { name: "User:7f", state: "hibernated" }, deck],
  [{ name: "Chat:42", state: "active" }, { name: "User:3c", state: "idle" }],
  [{ name: "Game:9", state: "active" }, { name: "Room:b2", state: "hibernated" }, { name: "User:e1", state: "idle" }],
];

// Reads the Deck's state from the node's operator /state. celld reports a
// resident cell (active or idle; it can't say which) and a dormant one, which
// keeps its hibernatable WebSockets on the node.
function deckCell(state: CelldState | null): Cell {
  if (!state) return { name: "Deck", state: "idle" };
  const resident = state.residents.some((id) => id.startsWith("Deck:"));
  return { name: "Deck", state: resident ? "idle" : state.phases.dormant ? "hibernated" : "inactive", live: true };
}

const NODE_X = [40, 420, 800];
const NODE_Y = 170;

function CellBox({ cell, x, y }: { cell: Cell; x: number; y: number }) {
  return (
    <g className={`cell cell-${cell.state}${cell.live ? " cell-live" : ""}`} transform={`translate(${x} ${y})`}>
      <rect width="100" height="64" rx="10" />
      <text x="50" y="28" className="cell-name">
        {cell.name}
      </text>
      <text x="50" y="50" className="cell-state">
        {cell.live && cell.state === "idle" ? "in memory" : cell.state}
      </text>
    </g>
  );
}

export function FleetDiagram() {
  const deck = deckCell(useCelldState());
  return (
    <svg className="fleet" viewBox="0 0 1200 690" role="img" aria-label="A celld fleet: nodes holding cells, backed by one bucket">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="context-stroke" />
        </marker>
      </defs>

      {/* Clients, and the request path: any node takes a request, the cell's owner runs it. */}
      {[150, 260, 370].map((x, i) => (
        <g key={x} className="client" transform={`translate(${x} 60)`}>
          <circle r="26" />
          <text y="7">{i === 0 ? "💻" : "📱"}</text>
        </g>
      ))}
      <text x="260" y="122" className="caption">
        clients
      </text>
      <path className="flow" d="M390 80 C 520 90, 590 130, 600 218" markerEnd="url(#arrow)" />
      <path className="flow" d="M450 262 C 420 270, 390 270, 370 286" markerEnd="url(#arrow)" />
      <text x="590" y="112" className="flow-label start">
        any node takes it; getByName("main") routes to the owner
      </text>

      {/* Legend */}
      <g transform="translate(630 22)">
        {LEGEND.map(([state, label], i) => (
          <g key={state} className={`cell cell-${state}`} transform={`translate(${(i % 2) * 280} ${Math.floor(i / 2) * 44})`}>
            <rect width="28" height="28" rx="6" />
            <text x="38" y="20" className="legend-label start">
              <tspan className="legend-state">{state}</tspan> {label}
            </text>
          </g>
        ))}
      </g>

      {/* The fleet: identical celld processes, each running the Worker and owning some cells. */}
      <rect className="fleet-frame" x="20" y="150" width="1160" height="320" rx="16" />
      <text x="36" y="142" className="caption start">
        fleet
      </text>
      {nodes(deck).map((cells, n) => (
        <g key={n}>
          <rect className="node" x={NODE_X[n]} y={NODE_Y} width="360" height="280" rx="12" />
          <text x={NODE_X[n] + 20} y={NODE_Y + 34} className="node-name start">
            node {n + 1}
          </text>
          <rect className="worker" x={NODE_X[n] + 20} y={NODE_Y + 50} width="320" height="40" rx="8" />
          <text x={NODE_X[n] + 180} y={NODE_Y + 76} className="worker-label">
            Worker · stateless isolates
          </text>
          {cells.map((cell, i) => (
            <CellBox key={cell.name} cell={cell} x={NODE_X[n] + 20 + i * 113} y={NODE_Y + 120} />
          ))}
          <text x={NODE_X[n] + 180} y={NODE_Y + 230} className="caption">
            each cell: one object, one thread, its own SQLite
          </text>
          <path className="sync" d={`M${NODE_X[n] + 180} ${NODE_Y + 284} V 520`} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        </g>
      ))}
      {deck.live && (
        <text x="336" y="374" className="live-tag">
          ● live
        </text>
      )}

      {/* The bucket: where every cell's state lives, so any node can pick a cell up. */}
      <path className="bucket" d="M120 540 V 650 A 480 26 0 0 0 1080 650 V 540" />
      <ellipse className="bucket" cx="600" cy="540" rx="480" ry="26" />
      <text x="600" y="590" className="bucket-name">
        bucket · S3 / R2 / GCS
      </text>
      <text x="600" y="618" className="caption">
        cell snapshots + write logs · node leases · deployments
      </text>
      {[180, 290, 910, 1020].map((x) => (
        <rect key={x} className="cell cell-inactive" x={x - 40} y="576" width="80" height="44" rx="8" />
      ))}
      <text x="235" y="645" className="caption">
        inactive cells
      </text>
      <text x="612" y="508" className="caption start">
        replicate writes · restore on wake
      </text>
    </svg>
  );
}
