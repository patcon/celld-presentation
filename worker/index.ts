import { DurableObject } from "cloudflare:workers";
import { Hono } from "hono";
import {
  DEFAULT_FEATURES,
  REACTION_EMOJIS,
  type ClientMessage,
  type Features,
  type ServerMessage,
} from "../shared/protocol";

type Env = {
  DECK: DurableObjectNamespace<Deck>;
};

// One Deck object holds the shared state for the whole presentation.
// Every client (slides screen, presenter remote, audience participation) connects to the same instance.
export class Deck extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].send(JSON.stringify(await this.state()));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(_ws: WebSocket, message: string | ArrayBuffer) {
    const msg: ClientMessage = JSON.parse(message as string);
    switch (msg.type) {
      case "goTo":
        await this.ctx.storage.put("slide", msg.slide);
        return this.broadcast(await this.state());
      case "toggle": {
        const features = await this.features();
        await this.ctx.storage.put("features", { ...features, [msg.feature]: msg.on });
        return this.broadcast(await this.state());
      }
      case "react":
        // Reactions are fire-and-forget: relayed to everyone, never stored.
        if (!(await this.features()).reactions) return;
        if (!REACTION_EMOJIS.includes(msg.emoji)) return;
        return this.broadcast({ type: "reaction", emoji: msg.emoji });
    }
  }

  broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const socket of this.ctx.getWebSockets()) socket.send(data);
  }

  async state(): Promise<ServerMessage> {
    const slide = (await this.ctx.storage.get<number>("slide")) ?? 0;
    return { type: "state", slide, features: await this.features() };
  }

  async features(): Promise<Features> {
    return { ...DEFAULT_FEATURES, ...(await this.ctx.storage.get<Features>("features")) };
  }
}

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/ws", (c) => c.env.DECK.getByName("main").fetch(c.req.raw));

export default app;
