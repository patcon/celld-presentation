import { Hono } from "hono";
import {
  DEFAULT_FEATURES,
  MAIN_CONTROLS,
  REACTION_EMOJIS,
  type ClientMessage,
  type Features,
  type PresenceMessage,
  type ServerMessage,
  type StateMessage,
} from "../shared/protocol";
import { WebSocketServer } from "./WebSocketServer";

type Env = {
  DECK: DurableObjectNamespace<Deck>;
  SELFIES: R2Bucket;
};

const AUDIENCE = "audience";
const MAX_SELFIE_BYTES = 1024 * 1024;

const selfieKey = (id: string) => `selfies/${id}.jpg`;

const unit = (n: unknown) => Math.min(Math.max(Number(n) || 0, 0), 1);

// One Deck object holds the shared state for the whole presentation.
// Every client (slides screen, presenter remote, audience participation) connects to the same instance.
export class Deck extends WebSocketServer<Env, ClientMessage, ServerMessage> {
  // /participation connects with `?role=audience`; only those sockets count towards presence.
  tags(request: Request) {
    return new URL(request.url).searchParams.get("role") === AUDIENCE ? [AUDIENCE] : [];
  }

  async onConnect(ws: WebSocket) {
    this.send(ws, await this.state());
    // So a reload, or the feature coming back on, still shows their own selfie.
    const selfie = await this.ctx.storage.get<number>(`selfie:${this.clientId(ws)}`);
    if (selfie) this.send(ws, { type: "selfie", selfie });
    if (!(await this.features()).presence) return;
    // A new audience member changes the list for everyone; anyone else just needs a copy.
    if (this.hasTag(ws, AUDIENCE)) await this.broadcastPresence();
    else this.send(ws, await this.presence());
  }

  async onClose(ws: WebSocket) {
    if (!this.hasTag(ws, AUDIENCE)) return;
    await this.broadcastPresence(ws);
    // So a phone that drops mid-touch doesn't leave its pointer stuck on screen.
    if ((await this.features()).main === "pointer") {
      this.broadcastExcept({ type: "pointer", at: null, from: this.clientId(ws) }, AUDIENCE);
    }
  }

  async onMessage(ws: WebSocket, msg: ClientMessage) {
    const from = this.clientId(ws);
    switch (msg.type) {
      case "goTo":
        await this.ctx.storage.put("slide", msg.slide);
        return this.broadcast({ ...(await this.state()), from });
      case "toggle": {
        if (typeof DEFAULT_FEATURES[msg.feature] !== "boolean") return;
        const features = await this.features();
        await this.ctx.storage.put("features", { ...features, [msg.feature]: msg.on });
        this.broadcast({ ...(await this.state()), from });
        if (msg.feature === "presence" && msg.on) await this.broadcastPresence();
        return;
      }
      case "setMain": {
        if (!MAIN_CONTROLS.includes(msg.main)) return;
        const features = await this.features();
        await this.ctx.storage.put("features", { ...features, main: msg.main });
        return this.broadcast({ ...(await this.state()), from });
      }
      case "point": {
        // Like reactions, relayed and never stored. Only screens draw pointers,
        // so phones aren't sent every move of everyone else's finger.
        if ((await this.features()).main !== "pointer") return;
        const at = msg.at && { x: unit(msg.at.x), y: unit(msg.at.y) };
        return this.broadcastExcept({ type: "pointer", at, from }, AUDIENCE);
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
    if ((await this.features()).main !== "selfies") return false;
    await this.env.SELFIES.put(selfieKey(id), image, { httpMetadata: { contentType: "image/jpeg" } });
    const selfie = Date.now();
    await this.ctx.storage.put(`selfie:${id}`, selfie);
    this.sendToClient(id, { type: "selfie", selfie });
    await this.broadcastPresence();
    return true;
  }

  // Called over RPC by the delete route. Allowed whatever the main control, so anyone can take theirs down.
  async deleteSelfie(id: string) {
    await this.env.SELFIES.delete(selfieKey(id));
    await this.ctx.storage.delete(`selfie:${id}`);
    this.sendToClient(id, { type: "selfie" });
    await this.broadcastPresence();
  }

  async state(): Promise<StateMessage> {
    const slide = (await this.ctx.storage.get<number>("slide")) ?? 0;
    return { type: "state", slide, features: await this.features() };
  }

  async features(): Promise<Features> {
    const { reactions, presence, main } = { ...DEFAULT_FEATURES, ...(await this.ctx.storage.get<Features>("features")) };
    // Picked out by name, so keys from older versions (like `selfies: boolean`) don't linger.
    return { reactions, presence, main };
  }

  // Everyone with /participation open, once each however many tabs they have.
  // `leaving` is a socket that is closing but may still be listed.
  async presence(leaving?: WebSocket): Promise<PresenceMessage> {
    const sockets = this.ctx.getWebSockets(AUDIENCE).filter((ws) => ws !== leaving);
    const ids = [...new Set(sockets.map((ws) => this.clientId(ws)))];
    const selfies = await this.ctx.storage.get<number>(ids.map((id) => `selfie:${id}`));
    return { type: "presence", people: ids.map((id) => ({ id, selfie: selfies.get(`selfie:${id}`) })) };
  }

  async broadcastPresence(leaving?: WebSocket) {
    if (!(await this.features()).presence) return;
    this.broadcast(await this.presence(leaving));
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

app.delete("/selfies/:id", async (c) => {
  await c.env.DECK.getByName("main").deleteSelfie(c.req.param("id").slice(0, 64));
  return c.body(null, 204);
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
