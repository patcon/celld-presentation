import { slides } from "../content";
import { useDeck } from "../useDeck";
import { useFloatingReactions } from "../components/FloatingReactions";

export function Slides() {
  const reactions = useFloatingReactions();
  const { slide } = useDeck({ onReaction: reactions.add });
  const s = slides[slide] ?? slides[0];
  return (
    <>
      {reactions.layer}
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
