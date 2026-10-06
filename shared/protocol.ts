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

// `from` is the id of the client whose message caused this one.
// The state snapshot sent on connect has no `from`.
export type StateMessage = { type: "state"; slide: number; features: Features; from?: string };
// Only sent while the presence feature is on.
export type PresenceMessage = { type: "presence"; people: Person[] };
// Sent only to the client it belongs to: on connect if they have one, and after each upload or delete.
// No `selfie` means they deleted it.
export type SelfieMessage = { type: "selfie"; selfie?: number };
export type ServerMessage =
  | StateMessage
  | PresenceMessage
  | SelfieMessage
  | { type: "reaction"; emoji: Emoji; from: string }
  // Only sent to non-audience screens, while the main control is the pointer.
  | { type: "pointer"; at: Point | null; from: string };
