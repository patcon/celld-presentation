import { useCallback, useState } from "react";
import type { Emoji } from "../../shared/protocol";

// Motion adapted from https://github.com/patcon/nextjs-livestream-reaction-app:
// each emoji starts tilted up to ±90°, swings upright as it grows and rises, then fades.
type Floater = { id: number; emoji: Emoji; left: number; startingAngle: number };

let nextId = 0;

const randomAngle = () => (Math.random() < 0.5 ? 1 : -1) * Math.floor(Math.random() * 90);

// Emoji that burst up from the bottom of the screen, behind page content or, with `inFront`, over it.
export function useFloatingReactions({ inFront = false }: { inFront?: boolean } = {}) {
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const add = useCallback((emoji: Emoji) => {
    const floater = { id: nextId++, emoji, left: 10 + Math.random() * 80, startingAngle: randomAngle() };
    setFloaters((fs) => [...fs, floater]);
  }, []);

  const remove = (id: number) => setFloaters((fs) => fs.filter((f) => f.id !== id));

  const layer = (
    <div className={inFront ? "reactions-layer in-front" : "reactions-layer"} aria-hidden>
      {floaters.map((f) => (
        <span
          key={f.id}
          className="floater"
          style={{ left: `${f.left}%`, "--starting-angle": `${f.startingAngle}deg` } as React.CSSProperties}
          onAnimationEnd={() => remove(f.id)}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );

  return { add, layer };
}
