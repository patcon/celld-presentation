import { useState } from "react";
import usePartySocket from "partysocket/react";
import {
  DEFAULT_FEATURES,
  type ClientMessage,
  type Emoji,
  type Features,
  type MainControl,
  type Person,
  type Point,
  type ServerMessage,
  type ToggleFeature,
} from "../shared/protocol";

const randomId = () => crypto.randomUUID?.() ?? Math.random().toString(16).slice(2);

// One id per browser, kept across reloads and reconnects, so the Deck can tell clients apart.
function clientId() {
  try {
    const id = localStorage.getItem("clientId") ?? randomId();
    localStorage.setItem("clientId", id);
    return id;
  } catch {
    return randomId();
  }
}

// Where every client connects; shared so other views can open their own socket.
export const DECK_SOCKET = {
  id: clientId(),
  basePath: "api/ws",
  protocol: location.protocol === "https:" ? "wss" : "ws",
} as const;

// Connects to the Deck Durable Object and tracks the shared presentation state.
// partysocket reconnects automatically (e.g. after a phone wakes from sleep),
// and the Deck re-sends full state on every connect.
// `audience` marks this client as someone to count in presence.
export function useDeck({
  onReaction,
  onPointer,
  audience = false,
}: {
  onReaction?: (emoji: Emoji) => void;
  onPointer?: (from: string, at: Point | null) => void;
  audience?: boolean;
} = {}) {
  const [slide, setSlide] = useState(0);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [people, setPeople] = useState<Person[]>([]);
  // When this client last uploaded a selfie, unless they've none (or deleted it).
  const [selfie, setSelfie] = useState<number>();

  const socket = usePartySocket({
    ...DECK_SOCKET,
    query: audience ? { role: "audience" } : undefined,
    onMessage(e) {
      const msg: ServerMessage = JSON.parse(e.data);
      if (msg.type === "state") {
        setSlide(msg.slide);
        setFeatures(msg.features);
        // Presence updates stop while it's off, so the last list would be stale when it comes back.
        if (!msg.features.presence) setPeople([]);
      } else if (msg.type === "presence") {
        setPeople(msg.people);
      } else if (msg.type === "selfie") {
        setSelfie(msg.selfie);
      } else if (msg.type === "reaction") {
        onReaction?.(msg.emoji);
      } else if (msg.type === "pointer") {
        onPointer?.(msg.from, msg.at);
      }
    },
  });

  const send = (msg: ClientMessage) => socket.send(JSON.stringify(msg));

  return {
    slide,
    features,
    people,
    selfie,
    goTo: (slide: number) => send({ type: "goTo", slide }),
    toggle: (feature: ToggleFeature, on: boolean) => send({ type: "toggle", feature, on }),
    setMain: (main: MainControl) => send({ type: "setMain", main }),
    react: (emoji: Emoji) => send({ type: "react", emoji }),
    point: (at: Point | null) => send({ type: "point", at }),
  };
}
