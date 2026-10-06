import type { TraceEvent } from "../shared/protocol";

// Reports each call a Durable Object makes on its SQLite database
// (ctx.storage, including ctx.storage.sql) or on an R2 bucket, for the fleet
// diagram to flash. It patches the objects in place, so the object's own code
// keeps using ctx.storage and env as usual.
//
// Only under celld, where ctx.storage is a plain JS object whose methods can be
// replaced (see DurableObjectState in celld's js/harness.js). celld's own
// internals call that same object, e.g. for alarms, so it's patched rather
// than swapped, and only the methods below report. Calls inside
// storage.transaction() go to a fresh storage object, so they don't report.

// celld bundles the worker itself, so a build-time flag from vite.config.ts
// never reaches it. Its storage object is recognisable by its own `_scope`
// (the cell's id), which workerd's has no equivalent of.
export const underCelld = (ctx: DurableObjectState) => "_scope" in ctx.storage;

const READS = ["get", "list", "head"];
const STORAGE_OPS = ["get", "put", "delete", "list", "deleteAll"];
const R2_OPS = ["head", "get", "put", "delete", "list", "createMultipartUpload"];

type Emit = (event: TraceEvent) => void;

// Reports `ops` on `target` itself, calling through to the originals.
function patch(target: Record<string, unknown>, ops: string[], describe: (op: string, args: unknown[]) => TraceEvent, emit: Emit) {
  for (const op of ops) {
    const original = target[op];
    if (typeof original !== "function") continue;
    target[op] = (...args: unknown[]) => {
      emit(describe(op, args));
      return original.apply(target, args);
    };
  }
}

const keysOf = (arg: unknown): string[] | undefined =>
  typeof arg === "string" ? [arg] : Array.isArray(arg) ? arg.map(String) : arg && typeof arg === "object" && !("prefix" in arg) ? Object.keys(arg) : undefined;

// Patches ctx.storage and returns env with each R2 binding swapped for a
// reporting copy. env is shared by every instance (celld constructs the object
// again after each eviction), so its bindings are copied, never patched, or
// the wrappers would stack.
export function traceCalls<Env>(ctx: DurableObjectState, env: Env, emit: Emit): Env {
  const cell = ctx.id.toString();
  const storage = ctx.storage as unknown as Record<string, unknown>;
  patch(storage, STORAGE_OPS, (op, [arg]) => ({ cell, store: "sqlite", op, write: !READS.includes(op), keys: keysOf(arg) }), emit);
  patch(
    ctx.storage.sql as unknown as Record<string, unknown>,
    ["exec"],
    (op, [query]) => ({ cell, store: "sqlite", op, write: !/^\s*(select|pragma|explain)\b/i.test(String(query)), sql: String(query) }),
    emit,
  );

  const traced = { ...(env as Record<string, unknown>) };
  for (const [binding, value] of Object.entries(traced)) {
    // createMultipartUpload is only on R2 bindings (KV has getWithMetadata instead).
    if (typeof (value as R2Bucket | undefined)?.createMultipartUpload !== "function") continue;
    const copy: Record<string, unknown> = {};
    for (const op of R2_OPS) {
      const method = (value as Record<string, unknown>)[op];
      if (typeof method === "function") copy[op] = method.bind(value);
    }
    patch(copy, R2_OPS, (op, [arg]) => ({ cell, store: "r2", binding, op, write: !READS.includes(op), keys: keysOf(arg) }), emit);
    traced[binding] = Object.setPrototypeOf(copy, value as object);
  }
  return traced as Env;
}

// Collects events and hands them on in one batch, after the awaits of a
// message's handler have settled (a timer runs after every pending microtask),
// so a message that makes several calls sends one trace message.
export function batched(flush: (events: TraceEvent[]) => void): Emit {
  let events: TraceEvent[] = [];
  return (event) => {
    if (events.push(event) > 1) return;
    setTimeout(() => {
      const batch = events;
      events = [];
      flush(batch);
    }, 0);
  };
}
