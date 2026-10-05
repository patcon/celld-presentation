import { Hono } from "hono";
import {
  DEFAULT_FEATURES,
  REACTION_EMOJIS,
  type ClientMessage,
  type Features,
  type ServerMessage,
  type StateMessage,
} from "../shared/protocol";
import { WebSocketServer } from "./WebSocketServer";

type Env = {
  DECK: DurableObjectNamespace<Deck>;
  SELFIES: R2Bucket;
};

const MAX_SELFIE_BYTES = 1024 * 1024;

const selfieKey = (id: string) => `selfies/${id}.jpg`;

// One Deck object holds the shared state for the whole presentation.
// Every client (slides screen, presenter remote, audience participation) connects to the same instance.
export class Deck extends WebSocketServer<Env, ClientMessage, ServerMessage> {
  async onConnect(ws: WebSocket) {
    this.send(ws, await this.state());
  }

  async onMessage(ws: WebSocket, msg: ClientMessage) {
    const from = this.clientId(ws);
    switch (msg.type) {
      case "goTo":
        await this.ctx.storage.put("slide", msg.slide);
        return this.broadcast({ ...(await this.state()), from });
      case "toggle": {
        if (!(msg.feature in DEFAULT_FEATURES)) return;
        const features = await this.features();
        await this.ctx.storage.put("features", { ...features, [msg.feature]: msg.on });
        return this.broadcast({ ...(await this.state()), from });
      }
      case "react":
        // Reactions are fire-and-forget: relayed to everyone, never stored.
        if (!(await this.features()).reactions) return;
        if (!REACTION_EMOJIS.includes(msg.emoji)) return;
        return this.broadcast({ type: "reaction", emoji: msg.emoji, from });
    }
  }

  // Called over RPC by the upload route. The image goes to the bucket;
  // the Deck only remembers when each client last uploaded one.
  async saveSelfie(id: string, image: ArrayBuffer): Promise<boolean> {
    if (!(await this.features()).selfies) return false;
    await this.env.SELFIES.put(selfieKey(id), image, { httpMetadata: { contentType: "image/jpeg" } });
    await this.ctx.storage.put(`selfie:${id}`, Date.now());
    return true;
  }

  async state(): Promise<StateMessage> {
    const slide = (await this.ctx.storage.get<number>("slide")) ?? 0;
    return { type: "state", slide, features: await this.features() };
  }

  async features(): Promise<Features> {
    return { ...DEFAULT_FEATURES, ...(await this.ctx.storage.get<Features>("features")) };
  }
}

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/ws", (c) => c.env.DECK.getByName("main").fetch(c.req.raw));

// The audience uploads a selfie as a JPEG, keyed by their client id (there's no auth, by design).
app.put("/selfies/:id", async (c) => {
  const id = c.req.param("id").slice(0, 64);
  if (c.req.header("Content-Type") !== "image/jpeg") return c.text("Expected image/jpeg", 415);
  const image = await c.req.arrayBuffer();
  if (image.byteLength > MAX_SELFIE_BYTES) return c.text("Selfie too large", 413);
  const saved = await c.env.DECK.getByName("main").saveSelfie(id, image);
  return saved ? c.body(null, 204) : c.text("Selfies are turned off", 403);
});

app.get("/selfies/:id", async (c) => {
  const object = await c.env.SELFIES.get(selfieKey(c.req.param("id")));
  if (!object) return c.notFound();
  // URLs carry `?v=<upload time>`, so each version can be cached forever.
  return c.body(object.body, 200, {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
});

export default app;
