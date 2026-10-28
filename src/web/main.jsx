import React from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./App.jsx";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
      <Analytics />
      <SpeedInsights />
    </React.StrictMode>
  );
  // The crawlable shells ship their own header outside #root so search engines
  // and no-JS visitors still get navigation. Hide that copy now that the app
  // renders one of its own, otherwise the page shows two stacked bars.
  document.body.classList.add("app-mounted");
}
