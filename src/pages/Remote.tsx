import { useEffect, useState } from "react";
import { slides } from "../content";
import { useDeck } from "../useDeck";
import { AudiencePreview } from "../components/AudiencePreview";
import type { Features } from "../../shared/protocol";

const FEATURE_LABELS: Record<keyof Features, string> = {
  reactions: "Reactions",
  selfies: "Selfies",
  presence: "Presence",
};

// The audience preview lives in the URL (`/remote?preview`), so it survives the phone
// reloading the tab after a screen lock, and the back gesture closes it.
const previewInUrl = () => new URLSearchParams(location.search).has("preview");

export function Remote() {
  const { slide, goTo, features, toggle } = useDeck();
  const [previewing, setPreviewing] = useState(previewInUrl);

  useEffect(() => {
    const onPop = () => setPreviewing(previewInUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openPreview = () => {
    history.pushState({ preview: true }, "", "?preview");
    setPreviewing(true);
  };

  const closePreview = () => {
    // Step back to /remote if we pushed the entry; if the page was opened at ?preview, swap it out
    // so closing doesn't leave the site.
    if (history.state?.preview) return history.back();
    history.replaceState(null, "", location.pathname);
    setPreviewing(false);
  };

  return (
    <div id="remote">
      <section>
        <h2>
          <button className="heading-link" onClick={openPreview} title="See what the audience sees">
            Participation ⛶
          </button>
        </h2>
        {(Object.keys(FEATURE_LABELS) as (keyof Features)[]).map((f) => (
          <label key={f} className="toggle">
            <input type="checkbox" checked={features[f]} onChange={(e) => toggle(f, e.target.checked)} />
            {FEATURE_LABELS[f]}
          </label>
        ))}
      </section>
      <section>
        <h2>Slides</h2>
        <ol id="slides">
          {slides.map((s, i) => (
            <li key={i} className={i === slide ? "current" : ""} onClick={() => goTo(i)}>
              {s.title}
            </li>
          ))}
        </ol>
      </section>
      {previewing && <AudiencePreview onClose={closePreview} />}
    </div>
  );
}
