import { useEffect, useState } from "react";
import { slides } from "./content";

export function Slides() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    fetch("/api").then((res) => res.json()).then(setSlide);
  }, []);

  const goTo = (n: number) =>                                                 // [!code ++]
    fetch("/api", { method: "POST", body: JSON.stringify(n) })                // [!code ++]
      .then((res) => res.json()).then(setSlide);                              // [!code ++]
                                                                              // [!code ++]
  return (
    <>
      <h1>{slides[slide].title}</h1>
      <button onClick={() => goTo(slide - 1)}>←</button>                      {/* [!code ++] */}
      <button onClick={() => goTo(slide + 1)}>→</button>                      {/* [!code ++] */}
    </>
  );
}
