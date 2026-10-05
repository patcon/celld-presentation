import { slides } from "./content";
import { useDeck } from "./useDeck";

export function Slides() {
  const { slide } = useDeck();
  const s = slides[slide] ?? slides[0];
  return (
    <main id="slide">
      <h1>{s.title}</h1>
      <p>{s.body}</p>
    </main>
  );
}
