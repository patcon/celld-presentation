import { useRef, useState } from "react";
import type { Point } from "../../shared/protocol";

// Clamped to the pad, in thousandths: finer than any screen's pixels, and keeps messages short.
const fraction = (n: number) => Math.round(Math.min(Math.max(n, 0), 1) * 1000) / 1000;

// Fills its container with a touchpad for the slides screen: touching a spot here pulls this person's
// presence circle out to the same relative spot there, stretched to fit. Moves go out at most once a frame.
export function PointerPad({ onPoint }: { onPoint: (at: Point | null) => void }) {
  const [touch, setTouch] = useState<Point | null>(null);
  // The newest position not yet sent, and the frame that will send it.
  const latest = useRef<Point | null>(null);
  const frame = useRef(0);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const at = { x: fraction((e.clientX - r.left) / r.width), y: fraction((e.clientY - r.top) / r.height) };
    latest.current = at;
    setTouch(at);
    frame.current ||= requestAnimationFrame(() => {
      frame.current = 0;
      onPoint(latest.current);
    });
  };

  const lift = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || !latest.current) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
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
      {touch ? (
        <span className="pointer-dot" style={{ left: `${touch.x * 100}%`, top: `${touch.y * 100}%` }} />
      ) : (
        <div className="pointer-hint">
          <span className="pulse" />
          <p>Touch and drag to point at the screen</p>
        </div>
      )}
    </div>
  );
}
