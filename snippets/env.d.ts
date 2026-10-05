// The bindings the snippets assume, matching wrangler.jsonc.
interface Env {
  DECK: DurableObjectNamespace<import("./deck-3").Deck>;
}
