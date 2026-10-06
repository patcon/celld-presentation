// The bindings the snippets assume, matching wrangler.jsonc.
interface Env {
  DECK: DurableObjectNamespace<import("./deck-4").Deck>;
  SELFIES: R2Bucket;
}
