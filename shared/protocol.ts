// Messages exchanged between browsers and the Deck Durable Object.

export const REACTION_EMOJIS = ["❤️", "👏", "🔥", "😂", "🤯", "🎉"] as const;
export type Emoji = (typeof REACTION_EMOJIS)[number];

// Participation features the presenter can toggle for /participation.
export type Features = { reactions: boolean };
export const DEFAULT_FEATURES: Features = { reactions: false };

export type ClientMessage =
  | { type: "goTo"; slide: number }
  | { type: "toggle"; feature: keyof Features; on: boolean }
  | { type: "react"; emoji: Emoji };

export type ServerMessage =
  | { type: "state"; slide: number; features: Features }
  | { type: "reaction"; emoji: Emoji };
