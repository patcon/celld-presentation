import { REACTION_EMOJIS } from "../../shared/protocol";
import { useDeck } from "../useDeck";
import { SelfieButton } from "../components/SelfieButton";
import { PointerPad } from "../components/PointerPad";

// The audience's participation interface. What it shows is toggled from /remote.
export function Participation() {
  const { features, react, selfie, point } = useDeck({ audience: true });
  const anyEnabled = features.reactions || features.presence || features.main !== "none";

  return (
    <>
      <main id="participation">
        {!anyEnabled && <p className="waiting">Hang tight — the presenter will open things up soon.</p>}
        {features.main === "selfies" && <SelfieButton selfie={selfie} />}
        {features.main === "pointer" && <PointerPad onPoint={point} />}
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
