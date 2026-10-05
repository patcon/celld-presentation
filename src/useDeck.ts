import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_FEATURES,
  type ClientMessage,
  type Emoji,
  type Features,
  type ServerMessage,
} from "../shared/protocol";

// Connects to the Deck Durable Object and tracks the shared presentation state.
export function useDeck({ onReaction }: { onReaction?: (emoji: Emoji) => void } = {}) {
  const [slide, setSlide] = useState(0);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const ws = useRef<WebSocket | null>(null);
  const reactionHandler = useRef(onReaction);
  reactionHandler.current = onReaction;

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${proto}//${location.host}/api/ws`);
    socket.onmessage = (e) => {
      const msg: ServerMessage = JSON.parse(e.data);
      if (msg.type === "state") {
        setSlide(msg.slide);
        setFeatures(msg.features);
      } else if (msg.type === "reaction") {
        reactionHandler.current?.(msg.emoji);
      }
    };
    ws.current = socket;
    return () => socket.close();
  }, []);

  const send = (msg: ClientMessage) => ws.current?.send(JSON.stringify(msg));

  return {
    slide,
    features,
    goTo: (slide: number) => send({ type: "goTo", slide }),
    toggle: (feature: keyof Features, on: boolean) => send({ type: "toggle", feature, on }),
    react: (emoji: Emoji) => send({ type: "react", emoji }),
  };
}
