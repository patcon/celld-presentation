import { useState, useSyncExternalStore } from "react";
import type { Point } from "../../shared/protocol";

// Where everyone is pointing, by client id. Kept outside React state, so a stream of moves
// redraws only the avatar that moved, not the slide under it.
function createPointerStore() {
  let pointers = new Map<string, Point>();
  const listeners = new Set<() => void>();
  const update = (next: Map<string, Point>) => {
    pointers = next;
    listeners.forEach((l) => l());
  };
  return {
    set(id: string, at: Point | null) {
      const next = new Map(pointers);
      if (at) next.set(id, at);
      else next.delete(id);
      update(next);
    },
    clear() {
      if (pointers.size) update(new Map());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: (id: string) => pointers.get(id),
  };
}

export type PointerStore = ReturnType<typeof createPointerStore>;

export function usePointerStore() {
  const [store] = useState(createPointerStore);
  return store;
}

// Where one client is pointing, if they are.
export function usePointer(store: PointerStore | undefined, id: string) {
  return useSyncExternalStore(store?.subscribe ?? noSubscribe, () => store?.get(id));
}

const noSubscribe = () => () => {};
