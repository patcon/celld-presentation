// Shared client: connects to the Deck Durable Object and reports slide changes.
export function connect(onSlide: (slide: number) => void) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/api/ws`);
  ws.onmessage = (e) => onSlide(JSON.parse(e.data).slide);
  return {
    goTo: (slide: number) => ws.send(JSON.stringify({ slide })),
  };
}
