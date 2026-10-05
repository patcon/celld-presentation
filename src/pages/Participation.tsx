import { REACTION_EMOJIS } from "../../shared/protocol";
import { useDeck } from "../useDeck";
import { SelfieButton } from "../components/SelfieButton";

// The audience's participation interface. What it shows is toggled from /remote.
export function Participation() {
  const { features, react } = useDeck({ audience: true });
  const anyEnabled = Object.values(features).some(Boolean);

  return (
    <>
      <main id="participation">
        {!anyEnabled && <p className="waiting">Hang tight — the presenter will open things up soon.</p>}
        {features.selfies && <SelfieButton />}
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
