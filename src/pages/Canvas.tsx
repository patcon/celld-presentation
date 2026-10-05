import { REACTION_EMOJIS } from "../../shared/protocol";
import { useDeck } from "../useDeck";

// The audience's participation interface. What it shows is toggled from /remote.
export function Canvas() {
  const { features, react } = useDeck();
  const anyEnabled = Object.values(features).some(Boolean);

  return (
    <>
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
