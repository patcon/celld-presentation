import { connect } from "./deck";
import { slides } from "./slides";

const el = document.querySelector<HTMLElement>("#slide")!;

connect((i) => {
  const s = slides[i] ?? slides[0];
  el.innerHTML = `<h1>${s.title}</h1><p>${s.body}</p>`;
});
