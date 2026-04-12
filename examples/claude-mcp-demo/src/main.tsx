import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { mountDevPilot } from "../../../packages/devpilot/src/index";
import "./styles.css";

const ENDPOINT = "http://127.0.0.1:5213";

mountDevPilot({
  endpoint: ENDPOINT,
  defaultOpen: true,
  features: { mcp: true, stability: true },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
