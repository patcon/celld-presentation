import { useEffect, useRef, useState } from "react";

// Connects to the Deck Durable Object and tracks the current slide.
export function useDeck() {
  const [slide, setSlide] = useState(0);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${proto}//${location.host}/api/ws`);
    socket.onmessage = (e) => setSlide(JSON.parse(e.data).slide);
    ws.current = socket;
    return () => socket.close();
  }, []);

  const goTo = (i: number) => ws.current?.send(JSON.stringify({ slide: i }));

  return { slide, goTo };
}
