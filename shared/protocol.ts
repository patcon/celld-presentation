// Messages exchanged between browsers and the Deck Durable Object.

export const REACTION_EMOJIS = ["❤️", "👏", "🔥", "😂", "🤯", "🎉"] as const;
export type Emoji = (typeof REACTION_EMOJIS)[number];

// Participation features the presenter can toggle for /participation.
export type Features = { reactions: boolean; selfies: boolean };
export const DEFAULT_FEATURES: Features = { reactions: false, selfies: false };

export type ClientMessage =
  | { type: "goTo"; slide: number }
  | { type: "toggle"; feature: keyof Features; on: boolean }
  | { type: "react"; emoji: Emoji };

// `from` is the id of the client whose message caused this one.
// The state snapshot sent on connect has no `from`.
export type StateMessage = { type: "state"; slide: number; features: Features; from?: string };
export type ServerMessage = StateMessage | { type: "reaction"; emoji: Emoji; from: string };
