import { useSyncExternalStore } from "react";

// Pulls each audience member's presence circle to the WebSocket dot of theirs
// in the fleet diagram, while both are on screen: the avatar springs over until
// it sits on the dot, and the dot is tugged along as it arrives. When the
// diagram goes, or presence does, both spring back. Pointing wins: a pointing
// avatar is left to the pointer's CSS transitions, and picked up again from
// wherever it is once they let go.

type Vec = { x: number; y: number };
type Body = { p: Vec; v: Vec };

type Avatar = { el: HTMLElement; body: Body; pointing: boolean; driving: boolean };
// Where a dot sits on screen when it's at home, and how many px one diagram unit is.
type Home = { x: number; y: number; scale: number };
type Anchor = { home: () => Home | null; apply: (dx: number, dy: number) => void; body: Body };

const PAIR_K = 400; // avatar to dot, per px of stretch
const HOME_K = 90; // avatar back to its slot
const DOT_K = 900; // dot back to its place, so it only gives a little
const DOT_MASS = 4;
const damping = (k: number, mass = 1) => 2 * 0.6 * Math.sqrt(k * mass); // a little under critical, so it bounces
const STEP = 1 / 240;

const avatars = new Map<string, Avatar>();
const anchors = new Map<string, Anchor>();
const body = (): Body => ({ p: { x: 0, y: 0 }, v: { x: 0, y: 0 } });
const resting = ({ p, v }: Body) => Math.hypot(p.x, p.y) < 0.3 && Math.hypot(v.x, v.y) < 5;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let frame = 0;
let last = 0;

function wake() {
  if (frame) return;
  last = performance.now();
  frame = requestAnimationFrame(step);
}

// Take over from wherever the CSS left the avatar, mid-transition or not.
function drive(a: Avatar) {
  const [x = 0, y = 0] = getComputedStyle(a.el).translate.split(" ").map(parseFloat);
  a.body = { p: { x: x || 0, y: y || 0 }, v: { x: 0, y: 0 } };
  a.el.dataset.tethered = "";
  a.driving = true;
}

function release(a: Avatar, home: boolean) {
  delete a.el.dataset.tethered;
  if (home) a.el.style.removeProperty("translate");
  a.driving = false;
}

// The centre of an avatar's slot, which `translate` doesn't move.
function slot(el: HTMLElement): Vec | null {
  const list = el.offsetParent;
  if (!list) return null;
  const box = list.getBoundingClientRect();
  return { x: box.left + el.offsetLeft + el.offsetWidth / 2, y: box.top + el.offsetTop + el.offsetHeight / 2 };
}

function step(now: number) {
  frame = 0;
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;

  const pairs: { a: Avatar; anchor: Anchor; from: Vec; to: Vec; rest: number }[] = [];
  const loose: Avatar[] = [];
  for (const [id, a] of avatars) {
    if (a.pointing) continue;
    const anchor = anchors.get(id);
    const from = slot(a.el);
    const home = anchor?.home();
    if (anchor && from && home && !reducedMotion()) {
      if (!a.driving) drive(a);
      // Attached avatars shrink to half size (see style.css), and offsetWidth ignores `scale`.
      pairs.push({ a, anchor, from, to: home, rest: a.el.offsetWidth / 4 });
    } else if (a.driving) loose.push(a);
  }

  for (let t = 0; t < dt; t += STEP) {
    for (const { a, anchor, from, to, rest } of pairs) {
      const { p, v } = a.body;
      const q = anchor.body.p;
      // Towards sitting right above the dot, with the dot on its bottom edge and its line running on down.
      const fx = PAIR_K * (to.x + q.x - (from.x + p.x));
      const fy = PAIR_K * (to.y + q.y - rest - (from.y + p.y));
      v.x += (fx - damping(PAIR_K) * v.x) * STEP;
      v.y += (fy - damping(PAIR_K) * v.y) * STEP;
      anchor.body.v.x -= (fx / DOT_MASS) * STEP;
      anchor.body.v.y -= (fy / DOT_MASS) * STEP;
    }
    for (const { body: b } of loose) {
      b.v.x += (-HOME_K * b.p.x - damping(HOME_K) * b.v.x) * STEP;
      b.v.y += (-HOME_K * b.p.y - damping(HOME_K) * b.v.y) * STEP;
    }
    for (const { body: b } of anchors.values()) {
      b.v.x += ((-DOT_K * b.p.x - damping(DOT_K, DOT_MASS) * b.v.x) / DOT_MASS) * STEP;
      b.v.y += ((-DOT_K * b.p.y - damping(DOT_K, DOT_MASS) * b.v.y) / DOT_MASS) * STEP;
    }
    for (const b of [...pairs.map(({ a }) => a.body), ...loose.map((a) => a.body), ...[...anchors.values()].map((n) => n.body)]) {
      b.p.x += b.v.x * STEP;
      b.p.y += b.v.y * STEP;
    }
  }

  let busy = pairs.length > 0;
  for (const a of avatars.values()) {
    if (pairs.some((pair) => pair.a === a)) a.el.dataset.attached = "";
    else delete a.el.dataset.attached;
  }
  for (const { a } of pairs) a.el.style.translate = `${a.body.p.x}px ${a.body.p.y}px`;
  for (const a of loose) {
    if (resting(a.body)) release(a, true);
    else {
      a.el.style.translate = `${a.body.p.x}px ${a.body.p.y}px`;
      busy = true;
    }
  }
  for (const anchor of anchors.values()) {
    const scale = anchor.home()?.scale || 1;
    if (resting(anchor.body)) anchor.body = body();
    else busy = true;
    anchor.apply(anchor.body.p.x / scale, anchor.body.p.y / scale);
  }
  if (busy) wake();
}

export function registerAvatar(id: string, el: HTMLElement) {
  const a: Avatar = { el, body: body(), pointing: false, driving: false };
  avatars.set(id, a);
  wake();
  return () => {
    if (avatars.get(id) === a) avatars.delete(id);
  };
}

// Call before moving a pointing avatar, so its CSS transition isn't switched off.
export function setPointing(id: string, pointing: boolean) {
  const a = avatars.get(id);
  if (!a || a.pointing === pointing) return;
  a.pointing = pointing;
  if (pointing && a.driving) release(a, false);
  wake();
}

export function registerAnchor(id: string, anchor: Omit<Anchor, "body">) {
  const entry: Anchor = { ...anchor, body: body() };
  anchors.set(id, entry);
  wake();
  return () => {
    if (anchors.get(id) === entry) anchors.delete(id);
    wake();
  };
}

// Who's in the presence list, in order, for the diagram to tag its dots with.
let people: string[] = [];
const listeners = new Set<() => void>();

export function setTetherPeople(ids: string[]) {
  if (ids.length === people.length && ids.every((id, i) => id === people[i])) return;
  people = ids;
  listeners.forEach((l) => l());
}

export function useTetherPeople() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => people,
  );
}
