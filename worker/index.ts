import { DurableObject } from "cloudflare:workers";

interface Env {
  DECK: DurableObjectNamespace<Deck>;
}

// One Deck object holds the shared state for the whole presentation.
// Every client (slides screen, presenter remote) connects to the same instance.
export class Deck extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].send(JSON.stringify({ slide: await this.slide() }));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer) {
    const { slide } = JSON.parse(message as string);
    await this.ctx.storage.put("slide", slide);
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(JSON.stringify({ slide }));
    }
  }

  async slide(): Promise<number> {
    return (await this.ctx.storage.get<number>("slide")) ?? 0;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ws") {
      return env.DECK.getByName("main").fetch(request);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
