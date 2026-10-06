import { useRef, useState } from "react";
import type { Point } from "../../shared/protocol";

// Clamped to the pad, in thousandths: finer than any screen's pixels, and keeps messages short.
const fraction = (n: number) => Math.round(Math.min(Math.max(n, 0), 1) * 1000) / 1000;

// Plenty for the slides' eased circle to look smooth, at half the messages of once a frame.
const SEND_INTERVAL = 1000 / 30;

// Fills its container with a touchpad for the slides screen: touching a spot here pulls this person's
// presence circle out to the same relative spot there, stretched to fit. Moves go out at most 30 times a second.
// The blue dot does the same here: it springs from the middle to the finger and back on release.
export function PointerPad({ onPoint }: { onPoint: (at: Point | null) => void }) {
  const [touch, setTouch] = useState<Point | null>(null);
  // The newest position not yet sent, the timer that will send it, and when we last sent one.
  const latest = useRef<Point | null>(null);
  const timer = useRef(0);
  const lastSent = useRef(0);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const at = { x: fraction((e.clientX - r.left) / r.width), y: fraction((e.clientY - r.top) / r.height) };
    latest.current = at;
    setTouch(at);
    if (timer.current) return;
    const wait = Math.max(0, lastSent.current + SEND_INTERVAL - performance.now());
    timer.current = window.setTimeout(() => {
      timer.current = 0;
      lastSent.current = performance.now();
      onPoint(latest.current);
    }, wait);
  };

  const lift = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || !latest.current) return;
    clearTimeout(timer.current);
    timer.current = 0;
    latest.current = null;
    setTouch(null);
    onPoint(null);
  };

  return (
    <div
      className="pointer-pad"
      onPointerDown={(e) => {
        if (!e.isPrimary) return;
        // Keep following the finger even if it slides off the pad.
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.isPrimary && latest.current && move(e)}
      onPointerUp={lift}
      onPointerCancel={lift}
    >
      <span
        className={touch ? "pointer-dot touching" : "pointer-dot"}
        style={touch ? { left: `${touch.x * 100}%`, top: `${touch.y * 100}%` } : undefined}
      />
      {!touch && <p className="pointer-hint">Touch and drag to point at the screen</p>}
    </div>
  );
}
