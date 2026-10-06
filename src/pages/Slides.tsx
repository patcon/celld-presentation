import { useEffect } from "react";
import { slides } from "../content";
import { useDeck } from "../useDeck";
import { useFloatingReactions } from "../components/FloatingReactions";
import { Presence } from "../components/Presence";
import { usePointerStore } from "../components/Pointers";

const NEXT_KEYS = ["ArrowRight", "PageDown"];
const PREV_KEYS = ["ArrowLeft", "PageUp"];

// `/` is a passive display; `/present` is the same view with keyboard control.
export function Slides({ keyboard = false }: { keyboard?: boolean }) {
  const reactions = useFloatingReactions({ inFront: true });
  const pointers = usePointerStore();
  const { slide, goTo, features, people } = useDeck({ onReaction: reactions.add, onPointer: pointers.set });

  // Nobody lifts a finger when the pointer gets switched off, so clear them all.
  useEffect(() => {
    if (features.main !== "pointer") pointers.clear();
  }, [features.main, pointers.clear]);

  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const step = NEXT_KEYS.includes(e.key) ? 1 : PREV_KEYS.includes(e.key) ? -1 : 0;
      const target = Math.min(Math.max(slide + step, 0), slides.length - 1);
      if (step === 0 || target === slide) return;
      e.preventDefault();
      goTo(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, slide, goTo]);

  const s = slides[slide] ?? slides[0];
  return (
    <>
      {reactions.layer}
      {/* Always mounted: turning presence off empties the list, so everyone animates out. */}
      <Presence people={people} pointers={pointers} />
      <main id="slide">
        {s.content ?? (
          <>
            <h1>{s.title}</h1>
            <p>{s.body}</p>
          </>
        )}
      </main>
    </>
  );
}
