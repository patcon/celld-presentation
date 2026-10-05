import type { ReactNode } from "react";
import { JoinQrCode } from "./components/JoinQrCode";
import { MessageLog } from "./components/MessageLog";
import { Code } from "./components/Code";
// Snippets are hand-written, simplified versions of the real code, not imported from it.
import wrangler1 from "../snippets/wrangler-1.jsonc?raw";
import wrangler2 from "../snippets/wrangler-2.jsonc?raw";
import deck1 from "../snippets/deck-1.ts?raw";
import deck2 from "../snippets/deck-2.ts?raw";
import deck3 from "../snippets/deck-3.ts?raw";

// A slide shows its title and body, or, if it has `content`, only that.
// The title is always listed on /remote.
export type Slide = { title: string; body?: string; content?: ReactNode };

// Placeholder slides; real content comes later.
export const slides: Slide[] = [
  { title: "Durable Objects", body: "an actor system, at the infrastructure level" },
  { title: "Context", body: "durable-pi, and Durable Objects retrofitted the same day" },
  { title: "One object", body: "this deck's current slide lives in a single Durable Object" },
  // Adjacent <Code> slides animate from one snippet to the next.
  { title: "Code: a Worker", content: <Code file="wrangler.jsonc" lang="jsonc" code={wrangler1} /> },
  { title: "Code: + Durable Object binding", content: <Code file="wrangler.jsonc" lang="jsonc" code={wrangler2} /> },
  { title: "Code: getByName", content: <Code file="worker/index.ts" lang="ts" code={deck1} /> },
  { title: "Code: storing the slide", content: <Code file="worker/index.ts" lang="ts" code={deck2} /> },
  { title: "Code: calling it over RPC", content: <Code file="worker/index.ts" lang="ts" code={deck3} /> },
  { title: "Join in (QR code)", content: <JoinQrCode /> },
  { title: "Message log (terminal)", content: <MessageLog layout="wide" /> },
];
