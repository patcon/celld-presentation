import type { ReactNode } from "react";
import { JoinQrCode } from "./components/JoinQrCode";
import { MessageLog } from "./components/MessageLog";

// A slide shows its title and body, or, if it has `content`, only that.
// The title is always listed on /remote.
export type Slide = { title: string; body?: string; content?: ReactNode };

// Placeholder slides; real content comes later.
export const slides: Slide[] = [
  { title: "Durable Objects", body: "an actor system, at the infrastructure level" },
  { title: "Context", body: "durable-pi, and Durable Objects retrofitted the same day" },
  { title: "One object", body: "this deck's current slide lives in a single Durable Object" },
  { title: "Join in (QR code)", content: <JoinQrCode /> },
  { title: "Message log (terminal)", content: <MessageLog layout="wide" /> },
];
