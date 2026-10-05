import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Slides } from "./pages/Slides";
import { Remote } from "./pages/Remote";
import { Participation } from "./pages/Participation";
import "./style.css";

// Each view is opened directly on its own device, so a pathname switch is enough.
const routes: Record<string, () => React.JSX.Element> = {
  "/": () => <Slides />,
  "/present": () => <Slides keyboard />,
  "/remote": Remote,
  "/participation": Participation,
};
const View = routes[location.pathname.replace(/\/$/, "") || "/"] ?? routes["/"];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <View />
  </StrictMode>,
);
