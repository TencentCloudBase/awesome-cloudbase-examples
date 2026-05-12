import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorReporter from "./components/ErrorReporter";

// ErrorReporter ships in the dev bundle but only renders when running
// `vite` (dev server). In a production `vite build`, `import.meta.env.DEV`
// is the literal `false`; Rollup folds the conditional and the unused
// import — so the component is dead-code eliminated from prod assets.
//
// We deliberately don't lazy()-load it: a dynamic import going through a
// preview proxy / iframe gateway can quietly fail (network 404 on the
// chunk URL) and leave Suspense hung on `fallback={null}`, i.e. nothing
// visible. Direct import is more boring and more reliable.
const root = (
  <StrictMode>
    {import.meta.env.DEV ? (
      <ErrorReporter>
        <App />
      </ErrorReporter>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(root);
