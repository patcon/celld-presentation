import { DurableObject } from "cloudflare:workers";

export class Deck extends DurableObject {
  async goTo(slide: number) {                                    // [!code ++]
    await this.ctx.storage.put("slide", slide);                  // [!code ++]
  }                                                              // [!code ++]
                                                                 // [!code ++]
  async slide() {                                                // [!code ++]
    return (await this.ctx.storage.get<number>("slide")) ?? 0;   // [!code ++]
  }                                                              // [!code ++]
}

export default {
  async fetch(request: Request, env: Env) {
    const deck = env.DECK.getByName("main");
    return new Response("Hello from the Worker");
  },
};
