import type { useDeck } from "../useDeck";
import { ParticipationView } from "../pages/Participation";

// Full-screen overlay showing exactly what the audience sees on /participation.
// It shares the remote's connection, which already counts as an audience member.
export function AudiencePreview({ deck, onClose }: { deck: ReturnType<typeof useDeck>; onClose: () => void }) {
  return (
    <div className="audience-preview">
      <button className="back-button" onClick={onClose} aria-label="Close audience view">
        ← Back
      </button>
      <ParticipationView deck={deck} />
    </div>
  );
}
