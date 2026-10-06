import { useLayoutEffect, useRef, useState } from "react";
import { selfieUrl, type Person } from "../../shared/protocol";
import { usePointer, type PointerStore } from "./Pointers";
import { defaultAvatar } from "../avatar";

// A stable colour per client, behind their picture while it loads.
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

// One audience member's circle. While they touch their pointer pad, it springs out of its slot
// to the matching spot on screen and follows their finger; when they let go, it springs back.
function Avatar({ person, pointers, onGone }: { person: Shown; pointers?: PointerStore; onGone: () => void }) {
  const li = useRef<HTMLLIElement>(null);
  const at = usePointer(pointers, person.id);

  // `translate` doesn't move the slot (offsetLeft/Top), so measure from there to the pointer.
  useLayoutEffect(() => {
    const el = li.current;
    const list = el?.offsetParent;
    if (!el || !list) return;
    if (!at) return void el.style.removeProperty("translate");
    const box = list.getBoundingClientRect();
    const x = at.x * innerWidth - (box.left + el.offsetLeft + el.offsetWidth / 2);
    const y = at.y * innerHeight - (box.top + el.offsetTop + el.offsetHeight / 2);
    el.style.translate = `${x}px ${y}px`;
  }, [at]);

  const classes = [person.leaving && "leaving", at && "pointing"].filter(Boolean).join(" ");
  return (
    <li
      ref={li}
      className={classes || undefined}
      style={{ "--hue": hue(person.id) } as React.CSSProperties}
      onAnimationEnd={person.leaving ? onGone : undefined}
    >
      <img src={person.selfie ? selfieUrl(person) : defaultAvatar(person.id)} alt="" />
    </li>
  );
}

// Everyone on /participation, as circles down the right edge of the slides.
// With `pointers`, anyone pointing has their circle pulled out to where they point.
export function Presence({ people, pointers }: { people: Person[]; pointers?: PointerStore }) {
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
        <Avatar key={p.id} person={p} pointers={pointers} onGone={() => remove(p.id)} />
      ))}
    </ul>
  );
}
