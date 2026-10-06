import { useEffect, useState } from "react";
import { slides } from "../content";
import { useDeck } from "../useDeck";
import { AudiencePreview } from "../components/AudiencePreview";
import { MAIN_CONTROLS, type MainControl, type ToggleFeature } from "../../shared/protocol";

const MAIN_CONTROL_LABELS: Record<MainControl, string> = {
  none: "None",
  selfies: "Selfies",
  pointer: "Pointer",
};


// The audience preview lives in the URL (`/remote?preview`), so it survives the phone
// reloading the tab after a screen lock, and the back gesture closes it.
const previewInUrl = () => new URLSearchParams(location.search).has("preview");

export function Remote() {
  const { slide, goTo, features, toggle, setMain } = useDeck();
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

  const toggleFor = (feature: ToggleFeature, label: string) => (
    <label className="toggle">
      <input type="checkbox" checked={features[feature]} onChange={(e) => toggle(feature, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div id="remote">
      <section>
        <h2>
          <button className="heading-link" onClick={openPreview} title="See what the audience sees">
            Participation ⛶
          </button>
        </h2>
        {toggleFor("reactions", "Reactions")}
        <select
          className="main-control"
          aria-label="Main control"
          value={features.main}
          onChange={(e) => setMain(e.target.value as MainControl)}
        >
          {MAIN_CONTROLS.map((m) => (
            <option key={m} value={m}>
              {MAIN_CONTROL_LABELS[m]}
            </option>
          ))}
        </select>
        {toggleFor("presence", "Presence")}
      </section>
      <section className="slide-list">
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
