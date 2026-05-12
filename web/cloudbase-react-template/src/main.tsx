import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";

// ErrorReporter intentionally is NOT mounted from here. It's bootstrapped
// from index.html into its own React root (`#error-reporter-root`) so that
// when this file's import chain fails — for example a syntax error in App,
// or any module along its transitive imports failing to load — the dev
// overlay still appears. See `src/bootstrap-error-reporter.tsx` and the
// inline <script> in `index.html`.
//
// AppErrorBoundary, on the other hand, is part of the prod bundle: it's the
// last-line-of-defence against a render-time crash leaving the user with a
// blank `<div id="root">`. It only catches React render errors (not module
// load failures, not async throws); the rest is covered by the dev overlay.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
