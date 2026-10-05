import { slides } from "./content";
import { useDeck } from "./useDeck";

export function Remote() {
  const { slide, goTo } = useDeck();
  return (
    <ol id="slides">
      {slides.map((s, i) => (
        <li key={i} className={i === slide ? "current" : ""} onClick={() => goTo(i)}>
          {s.title}
        </li>
      ))}
    </ol>
  );
}
