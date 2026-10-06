import { REACTION_EMOJIS } from "../../shared/protocol";
import { useDeck } from "../useDeck";
import { SelfieButton } from "../components/SelfieButton";
import { PointerPad } from "../components/PointerPad";

type Deck = ReturnType<typeof useDeck>;

// The audience's participation interface. What it shows is toggled from /remote.
export function Participation() {
  return <ParticipationView deck={useDeck({ role: "audience" })} />;
}

// Also shown over /remote as its audience preview, on the remote's own connection.
export function ParticipationView({ deck }: { deck: Deck }) {
  const { features, react, selfie, point } = deck;
  // Presence puts nothing on this page (it shows on the slides), so it alone still leaves them waiting.
  const anyEnabled = features.reactions || features.main !== "none";

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
