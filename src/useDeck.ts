import { useState } from "react";
import usePartySocket from "partysocket/react";
import {
  DEFAULT_FEATURES,
  type ClientMessage,
  type Emoji,
  type Features,
  type ServerMessage,
} from "../shared/protocol";

// Where every client connects; shared so other views can open their own socket.
export const DECK_SOCKET = {
  basePath: "api/ws",
  protocol: location.protocol === "https:" ? "wss" : "ws",
} as const;

// Connects to the Deck Durable Object and tracks the shared presentation state.
// partysocket reconnects automatically (e.g. after a phone wakes from sleep),
// and the Deck re-sends full state on every connect.
export function useDeck({ onReaction }: { onReaction?: (emoji: Emoji) => void } = {}) {
  const [slide, setSlide] = useState(0);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);

  const socket = usePartySocket({
    ...DECK_SOCKET,
    onMessage(e) {
      const msg: ServerMessage = JSON.parse(e.data);
      if (msg.type === "state") {
        setSlide(msg.slide);
        setFeatures(msg.features);
      } else if (msg.type === "reaction") {
        onReaction?.(msg.emoji);
      }
    },
  });

  const send = (msg: ClientMessage) => socket.send(JSON.stringify(msg));

  return {
    slide,
    features,
    goTo: (slide: number) => send({ type: "goTo", slide }),
    toggle: (feature: keyof Features, on: boolean) => send({ type: "toggle", feature, on }),
    react: (emoji: Emoji) => send({ type: "react", emoji }),
  };
}
