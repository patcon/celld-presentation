import { useEffect } from "react";
import { Participation } from "../pages/Participation";

// Full-screen overlay showing exactly what the audience sees on /participation.
// Pushes a history entry so the device's back gesture closes it instead of leaving /remote.
export function AudiencePreview({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    // Guarded so StrictMode's double-run in dev doesn't push two entries.
    if (!history.state?.preview) history.pushState({ preview: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  return (
    <div className="audience-preview">
      <button className="back-button" onClick={() => history.back()} aria-label="Close audience view">
        ← Back
      </button>
      <Participation />
    </div>
  );
}
