import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Slides } from "./pages/Slides";
import { Remote } from "./pages/Remote";
import { Canvas } from "./pages/Canvas";
import "./style.css";

// Each view is opened directly on its own device, so a pathname switch is enough.
const routes: Record<string, () => React.JSX.Element> = {
  "/": Slides,
  "/remote": Remote,
  "/canvas": Canvas,
};
const View = routes[location.pathname.replace(/\/$/, "") || "/"] ?? Slides;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <View />
  </StrictMode>,
);
