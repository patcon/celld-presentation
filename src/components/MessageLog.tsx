import { useEffect, useRef, useState } from "react";
import usePartySocket from "partysocket/react";
import { DECK_SOCKET } from "../useDeck";

const MAX_LINES = 200;

type Line = { id: number; time: string; from: string; type: string; data: string };

let nextId = 0;

const timestamp = () => new Date().toLocaleTimeString([], { hour12: false });

// "wide" leaves the lower half free for floating reactions; "narrow" keeps to the left side.
export type MessageLogLayout = "full" | "wide" | "narrow";

// A terminal-style stream of every message the Deck sends.
// Opens its own socket, so it only listens while its slide is on screen.
export function MessageLog({ layout = "full" }: { layout?: MessageLogLayout }) {
  const [lines, setLines] = useState<Line[]>([]);
  const body = useRef<HTMLDivElement>(null);

  const log = (type: string, data = "", from = "") =>
    setLines((ls) => [...ls, { id: nextId++, time: timestamp(), from, type, data }].slice(-MAX_LINES));

  usePartySocket({
    ...DECK_SOCKET,
    onOpen: () => log("open"),
    onClose: () => log("close"),
    onMessage(e) {
      const { type, from, ...rest } = JSON.parse(e.data);
      log(type, JSON.stringify(rest), from);
    },
  });

  // Pin to the newest line, without scrolling the page around the terminal.
  useEffect(() => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [lines]);

  return (
    <figure className={`terminal terminal-${layout}`} aria-label="WebSocket message log">
      <figcaption>
        <span className="dots" aria-hidden />
        {DECK_SOCKET.protocol}://{location.host}/{DECK_SOCKET.basePath}
      </figcaption>
      <div ref={body} className="terminal-body" role="log">
        <div className="terminal-line terminal-header" aria-hidden>
          <span className="time">time</span>
          <span className="from">client</span>
          <span className="type">type</span>
          <span className="data">payload</span>
        </div>
        {lines.map((l) => (
          <div key={l.id} className="terminal-line">
            <span className="time">{l.time}</span>
            <span className="from">{l.from.slice(0, 8)}</span>
            <span className={`type type-${l.type}`}>{l.type}</span>
            <span className="data">{l.data}</span>
          </div>
        ))}
        <div className="cursor" aria-hidden />
      </div>
    </figure>
  );
}
