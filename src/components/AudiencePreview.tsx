import { Participation } from "../pages/Participation";

// Full-screen overlay showing exactly what the audience sees on /participation.
export function AudiencePreview({ onClose }: { onClose: () => void }) {
  return (
    <div className="audience-preview">
      <button className="back-button" onClick={onClose} aria-label="Close audience view">
        ← Back
      </button>
      <Participation />
    </div>
  );
}
