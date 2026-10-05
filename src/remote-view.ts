import { connect } from "./deck";
import { slides } from "./slides";

const list = document.querySelector<HTMLOListElement>("#slides")!;
let current = 0;

const deck = connect((i) => {
  current = i;
  render();
});

function render() {
  list.innerHTML = "";
  slides.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = s.title;
    li.className = i === current ? "current" : "";
    li.onclick = () => deck.goTo(i);
    list.append(li);
  });
}
