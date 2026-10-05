import { DurableObject } from "cloudflare:workers";

export class Deck extends DurableObject {}

export default {
  async fetch(request: Request, env: Env) {
    const deck = env.DECK.getByName("main"); // [!code highlight]
    return new Response("Hello from the Worker");
  },
};
