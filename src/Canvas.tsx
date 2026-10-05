import { REACTION_EMOJIS } from "../shared/protocol";
import { useDeck } from "./useDeck";
import { useFloatingReactions } from "./FloatingReactions";

// The audience's participation interface. What it shows is toggled from /remote.
export function Canvas() {
  const reactions = useFloatingReactions();
  const { features, react } = useDeck({ onReaction: reactions.add });
  const anyEnabled = Object.values(features).some(Boolean);

  return (
    <>
      {reactions.layer}
      <main id="canvas">
        {!anyEnabled && <p className="waiting">Hang tight — the presenter will open things up soon.</p>}
      </main>
      {features.reactions && (
        <nav className="reaction-bar">
          {REACTION_EMOJIS.map((emoji) => (
            <button key={emoji} onClick={() => react(emoji)} aria-label={`React ${emoji}`}>
              {emoji}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
