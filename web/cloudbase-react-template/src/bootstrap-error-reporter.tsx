/**
 * Standalone entry that mounts ErrorReporter into its OWN React root,
 * separate from the main App tree.
 *
 * Why a separate root: ErrorReporter is a dev-time safety net, and the
 * scenarios where you most want it to appear are exactly the scenarios
 * where the App tree fails to mount (a syntax error in App.tsx, a missing
 * import, an unresolvable module, …). If ErrorReporter shared the App
 * tree it would go down with it.
 *
 * Loaded from index.html via a tiny inline <script type="module"> that
 * dynamic-imports this file inside a try/catch, so even if THIS file
 * itself fails to evaluate, the page is unaffected.
 *
 * Mount target: a sibling <div id="error-reporter-root"></div> that the
 * inline script creates if it isn't already in the HTML.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorReporter from "./components/ErrorReporter";

const ROOT_ID = "error-reporter-root";

let host = document.getElementById(ROOT_ID);
if (!host) {
  host = document.createElement("div");
  host.id = ROOT_ID;
  document.body.appendChild(host);
}

createRoot(host).render(
  <StrictMode>
    <ErrorReporter />
  </StrictMode>,
);
