import { useCallback, useState } from "react";
import type { Emoji } from "../../shared/protocol";

type Floater = { id: number; emoji: Emoji; left: number; duration: number };

let nextId = 0;

// Emoji that drift up from the bottom of the screen, layered behind page content.
export function useFloatingReactions() {
  const [floaters, setFloaters] = useState<Floater[]>([]);

  const add = useCallback((emoji: Emoji) => {
    const floater = { id: nextId++, emoji, left: 5 + Math.random() * 90, duration: 4 + Math.random() * 2 };
    setFloaters((fs) => [...fs, floater]);
  }, []);

  const remove = (id: number) => setFloaters((fs) => fs.filter((f) => f.id !== id));

  const layer = (
    <div className="reactions-layer" aria-hidden>
      {floaters.map((f) => (
        <span
          key={f.id}
          className="floater"
          style={{ left: `${f.left}%`, animationDuration: `${f.duration}s` }}
          onAnimationEnd={() => remove(f.id)}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );

  return { add, layer };
}
