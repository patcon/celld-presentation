import { useState } from "react";
import { selfieUrl, type Person } from "../../shared/protocol";

// A stable colour per client, for people without a selfie yet.
const hue = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

type Shown = Person & { leaving?: boolean };

// Keeps people who've left in place, marked `leaving`, until their exit animation ends.
// Newcomers join the end; anyone returning mid-exit just stops leaving.
function merge(shown: Shown[], people: Person[]): Shown[] {
  const present = new Map(people.map((p) => [p.id, p]));
  const kept = shown.map((s) => present.get(s.id) ?? { ...s, leaving: true });
  const known = new Set(shown.map((s) => s.id));
  return [...kept, ...people.filter((p) => !known.has(p.id))];
}

// Everyone on /participation, as circles down the right edge of the slides.
export function Presence({ people }: { people: Person[] }) {
  const [shown, setShown] = useState<Shown[]>(people);
  const [prevPeople, setPrevPeople] = useState(people);
  // Merge during render when the list changes, so departures start animating on the same frame.
  if (people !== prevPeople) {
    setPrevPeople(people);
    setShown(merge(shown, people));
  }

  const remove = (id: string) => setShown((ss) => ss.filter((s) => !(s.id === id && s.leaving)));

  return (
    <ul className="presence" aria-label={`${people.length} in the audience`}>
      {shown.map((p) => (
        <li
          key={p.id}
          className={p.leaving ? "leaving" : undefined}
          style={{ "--hue": hue(p.id) } as React.CSSProperties}
          onAnimationEnd={p.leaving ? () => remove(p.id) : undefined}
        >
          {p.selfie && <img src={selfieUrl(p)} alt="" />}
        </li>
      ))}
    </ul>
  );
}
