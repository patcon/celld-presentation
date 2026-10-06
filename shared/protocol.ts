// Messages exchanged between browsers and the Deck Durable Object.

export const REACTION_EMOJIS = ["❤️", "👏", "🔥", "😂", "🤯", "🎉"] as const;
export type Emoji = (typeof REACTION_EMOJIS)[number];

// What fills the main area of /participation; only one at a time.
export const MAIN_CONTROLS = ["none", "selfies", "pointer"] as const;
export type MainControl = (typeof MAIN_CONTROLS)[number];

// Participation features the presenter sets for /participation.
export type Features = { reactions: boolean; presence: boolean; main: MainControl };
export type ToggleFeature = "reactions" | "presence";
export const DEFAULT_FEATURES: Features = { reactions: false, presence: false, main: "none" };

// A spot on screen, as fractions (0–1) of its width and height, so it maps between screens of any size.
export type Point = { x: number; y: number };

// An audience member with /participation open. `selfie` is when they last uploaded one,
// so it doubles as a cache-buster for `selfieUrl`.
export type Person = { id: string; selfie?: number };

export const selfieUrl = ({ id, selfie }: Person) => `/api/selfies/${encodeURIComponent(id)}?v=${selfie}`;

export type ClientMessage =
  | { type: "goTo"; slide: number }
  | { type: "toggle"; feature: ToggleFeature; on: boolean }
  | { type: "setMain"; main: MainControl }
  | { type: "react"; emoji: Emoji }
  // Where this client is pointing, or null once they let go.
  | { type: "point"; at: Point | null };

// `from` is the id of the client whose message caused this one, and `via` the
// id of the socket it came in on (a client has one per tab).
// The state snapshot sent on connect has neither.
export type StateMessage = { type: "state"; slide: number; features: Features; from?: string; via?: string };
// Only sent while the presence feature is on.
export type PresenceMessage = { type: "presence"; people: Person[] };
// Sent only to the client it belongs to: on connect if they have one, and after each upload or delete.
// No `selfie` means they deleted it.
export type SelfieMessage = { type: "selfie"; selfie?: number };
// What each open socket is: someone on /participation or /remote, a slides screen, or anything else.
export type SocketRole = "audience" | "screen" | "other";
// Sent to slides screens whenever a socket opens or closes, for the fleet diagram to label its sockets.
export type SocketsMessage = { type: "sockets"; sockets: { id: string; conn?: string; role: SocketRole }[] };
// A call a Deck made on its SQLite database (`ctx.storage`'s key-value methods) or an R2 bucket.
// Only sent under celld, to slides screens, for the fleet diagram.
// `cell` is the object's id; `write` is whether the call can change anything.
export type TraceEvent = {
  cell: string;
  store: "sqlite" | "r2";
  binding?: string;
  op: string;
  write: boolean;
  keys?: string[];
};
export type TraceMessage = { type: "trace"; events: TraceEvent[] };
export type ServerMessage =
  | TraceMessage
  | StateMessage
  | SocketsMessage
  | PresenceMessage
  | SelfieMessage
  | { type: "reaction"; emoji: Emoji; from: string; via?: string }
  // Only sent to non-audience screens, while the main control is the pointer.
  | { type: "pointer"; at: Point | null; from: string; via?: string };
