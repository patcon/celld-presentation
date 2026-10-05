import { Hono } from "hono";
import {
  DEFAULT_FEATURES,
  REACTION_EMOJIS,
  type ClientMessage,
  type Features,
  type ServerMessage,
} from "../shared/protocol";
import { WebSocketServer } from "./WebSocketServer";

type Env = {
  DECK: DurableObjectNamespace<Deck>;
};

// One Deck object holds the shared state for the whole presentation.
// Every client (slides screen, presenter remote, audience participation) connects to the same instance.
export class Deck extends WebSocketServer<Env, ClientMessage, ServerMessage> {
  async onConnect(ws: WebSocket) {
    this.send(ws, await this.state());
  }

  async onMessage(_ws: WebSocket, msg: ClientMessage) {
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
