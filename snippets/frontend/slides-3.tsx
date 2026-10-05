import { useEffect, useState } from "react";
import { slides } from "./content";

export function Slides() {
  const [slide, setSlide] = useState(0);

  // Other screens only find out about a change by asking.               // [!code focus]
  useEffect(() => {                                                       // [!code focus]
    const load = () => fetch("/api").then((res) => res.json()).then(setSlide); // [!code focus]
    load();                                                               // [!code focus]
    const timer = setInterval(load, 1000);                                // [!code focus]
    return () => clearInterval(timer);                                    // [!code focus]
  }, []);                                                                 // [!code focus]

  const goTo = (n: number) =>
    fetch("/api", { method: "POST", body: JSON.stringify(n) })
      .then((res) => res.json()).then(setSlide);

  return (
    <>
      <h1>{slides[slide].title}</h1>
      <button onClick={() => goTo(slide - 1)}>←</button>
      <button onClick={() => goTo(slide + 1)}>→</button>
    </>
  );
}
