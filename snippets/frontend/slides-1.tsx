import { useEffect, useState } from "react";
import { slides } from "./content";

export function Slides() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    fetch("/api").then((res) => res.json()).then(setSlide);
  }, []);

  return <h1>{slides[slide].title}</h1>;
}
