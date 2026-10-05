import { selfieUrl, type Person } from "../../shared/protocol";

// A stable colour per client, for people without a selfie yet.
const hue = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

// Everyone on /participation, as circles down the right edge of the slides.
export function Presence({ people }: { people: Person[] }) {
  return (
    <ul className="presence" aria-label={`${people.length} in the audience`}>
      {people.map((p) => (
        <li key={p.id} style={{ "--hue": hue(p.id) } as React.CSSProperties}>
          {p.selfie && <img src={selfieUrl(p)} alt="" />}
        </li>
      ))}
    </ul>
  );
}
