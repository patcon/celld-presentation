import { slides } from "./content";
import { useDeck } from "./useDeck";
import type { Features } from "../shared/protocol";

const FEATURE_LABELS: Record<keyof Features, string> = {
  reactions: "Reactions",
};

export function Remote() {
  const { slide, goTo, features, toggle } = useDeck();
  return (
    <div id="remote">
      <section>
        <h2>Canvas</h2>
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
    </div>
  );
}
