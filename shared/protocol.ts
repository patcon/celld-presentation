// Messages exchanged between browsers and the Deck Durable Object.

export const REACTION_EMOJIS = ["❤️", "👏", "🔥", "😂", "🤯", "🎉"] as const;
export type Emoji = (typeof REACTION_EMOJIS)[number];

// Participation features the presenter can toggle for /participation.
export type Features = { reactions: boolean; selfies: boolean; presence: boolean };
export const DEFAULT_FEATURES: Features = { reactions: false, selfies: false, presence: false };

// An audience member with /participation open. `selfie` is when they last uploaded one,
// so it doubles as a cache-buster for `selfieUrl`.
export type Person = { id: string; selfie?: number };

export const selfieUrl = ({ id, selfie }: Person) => `/api/selfies/${encodeURIComponent(id)}?v=${selfie}`;

export type ClientMessage =
  | { type: "goTo"; slide: number }
  | { type: "toggle"; feature: keyof Features; on: boolean }
  | { type: "react"; emoji: Emoji };

// `from` is the id of the client whose message caused this one.
// The state snapshot sent on connect has no `from`.
export type StateMessage = { type: "state"; slide: number; features: Features; from?: string };
// Only sent while the presence feature is on.
export type PresenceMessage = { type: "presence"; people: Person[] };
export type ServerMessage = StateMessage | PresenceMessage | { type: "reaction"; emoji: Emoji; from: string };
