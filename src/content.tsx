import type { ReactNode } from "react";
import { JoinQrCode } from "./components/JoinQrCode";
import { MessageLog } from "./components/MessageLog";
import { Code, type Lang } from "./components/Code";
// Snippets are hand-written, simplified versions of the real code, not imported from it.
import wrangler1 from "../snippets/worker/wrangler-1.jsonc?raw";
import wrangler2 from "../snippets/worker/wrangler-2.jsonc?raw";
import wrangler3 from "../snippets/worker/wrangler-3.jsonc?raw";
import deck1 from "../snippets/worker/deck-1.ts?raw";
import deck2 from "../snippets/worker/deck-2.ts?raw";
import deck3 from "../snippets/worker/deck-3.ts?raw";
import deck4 from "../snippets/worker/deck-4.ts?raw";
import slides1 from "../snippets/frontend/slides-1.tsx?raw";
import slides2 from "../snippets/frontend/slides-2.tsx?raw";
import slides3 from "../snippets/frontend/slides-3.tsx?raw";
import selfie1 from "../snippets/frontend/selfie-1.tsx?raw";
import selfie2 from "../snippets/frontend/selfie-2.tsx?raw";

// A slide shows its title and body, or, if it has `content`, only that.
// The title is always listed on /remote.
export type Slide = { title: string; body?: string; content?: ReactNode };

// Consecutive steps through one file, which animate from one to the next.
function codeSteps(file: string, lang: Lang, steps: [title: string, code: string][]): Slide[] {
  const fitTo = steps.map(([, code]) => code);
  return steps.map(([title, code]) => ({ title, content: <Code file={file} lang={lang} code={code} fitTo={fitTo} /> }));
}

// Placeholder slides; real content comes later.
export const slides: Slide[] = [
  { title: "Durable Objects", body: "an actor system, at the infrastructure level" },
  { title: "Context", body: "durable-pi, and Durable Objects retrofitted the same day" },
  { title: "One object", body: "this deck's current slide lives in a single Durable Object" },
  ...codeSteps("wrangler.jsonc", "jsonc", [
    ["Code: a Worker", wrangler1],
    ["Code: + Durable Object binding", wrangler2],
  ]),
  ...codeSteps("worker/index.ts", "ts", [
    ["Code: getByName", deck1],
    ["Code: storing the slide", deck2],
    ["Code: calling it over RPC", deck3],
  ]),
  ...codeSteps("src/Slides.tsx", "tsx", [
    ["Code: fetching the slide", slides1],
    ["Code: changing the slide", slides2],
    ["Code: polling for changes", slides3],
  ]),
  { title: "Join in (QR code)", content: <JoinQrCode /> },
  { title: "Message log (terminal)", content: <MessageLog layout="wide" /> },
  ...codeSteps("wrangler.jsonc", "jsonc", [["Code: + R2 bucket binding", wrangler3]]),
  ...codeSteps("worker/index.ts", "ts", [["Code: storing selfies in R2", deck4]]),
  ...codeSteps("src/Selfie.tsx", "tsx", [
    ["Code: uploading a selfie", selfie1],
    ["Code: showing it", selfie2],
  ]),
];
