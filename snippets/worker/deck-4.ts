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
    const { pathname } = new URL(request.url);                       // [!code ++]
    if (pathname.startsWith("/selfies/")) {                          // [!code ++]
      const key = pathname.slice(1);                                 // [!code ++]
      if (request.method === "PUT") await env.SELFIES.put(key, request.body); // [!code ++]
      const selfie = await env.SELFIES.get(key);                     // [!code ++]
      return new Response(selfie?.body, { status: selfie ? 200 : 404 }); // [!code ++]
    }                                                                // [!code ++]
                                                                     // [!code ++]
    const deck = env.DECK.getByName("main");
    if (request.method === "POST") await deck.goTo(await request.json());
    return Response.json(await deck.slide());
  },
};
