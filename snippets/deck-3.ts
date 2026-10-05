import { DurableObject } from "cloudflare:workers";

export class Deck extends DurableObject {
  async goTo(slide: number) {
    await this.ctx.storage.put("slide", slide);
  }

  async slide() {
    return (await this.ctx.storage.get<number>("slide")) ?? 0;
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const deck = env.DECK.getByName("main");                    // [!code focus]
    if (request.method === "POST") await deck.goTo(await request.json()); // [!code focus]
    return Response.json(await deck.slide());                  // [!code focus]
  },
};
