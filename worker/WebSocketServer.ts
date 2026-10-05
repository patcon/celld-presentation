import { DurableObject } from "cloudflare:workers";

// Stored on each socket, so it survives hibernation.
type Attachment = { id: string };

// A Durable Object that speaks JSON over hibernatable WebSockets.
// Subclasses implement the on* hooks and call send/broadcast.
export abstract class WebSocketServer<Env, In, Out> extends DurableObject<Env> {
  tags(_request: Request): string[] {
    return [];
  }
  onConnect(_ws: WebSocket): void | Promise<void> {}
  abstract onMessage(ws: WebSocket, msg: In): void | Promise<void>;
  onClose(_ws: WebSocket): void | Promise<void> {}

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    // acceptWebSocket (not server.accept()) lets the object hibernate while sockets stay open.
    this.ctx.acceptWebSocket(server, this.tags(request));
    // partysocket sends its client id as `?_pk=`; other clients get a fresh one.
    const id = new URL(request.url).searchParams.get("_pk")?.slice(0, 64) || crypto.randomUUID();
    server.serializeAttachment({ id } satisfies Attachment);
    await this.onConnect(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") return;
    let msg: In;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    await this.onMessage(ws, msg);
  }

  async webSocketClose(ws: WebSocket) {
    await this.onClose(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.onClose(ws);
  }

  send(ws: WebSocket, msg: Out) {
    ws.send(JSON.stringify(msg));
  }

  broadcast(msg: Out, tag?: string) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets(tag)) ws.send(data);
  }

  clientId(ws: WebSocket) {
    return (ws.deserializeAttachment() as Attachment).id;
  }

  hasTag(ws: WebSocket, tag: string) {
    return this.ctx.getTags(ws).includes(tag);
  }
}
