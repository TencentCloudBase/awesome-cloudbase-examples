import { StrictMode, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// ErrorReporter is only loaded in dev. In production builds
// `import.meta.env.DEV` is the constant `false`, so the lazy() call and the
// dynamic import below are dead code and Rollup will drop the chunk entirely.
const Wrapper = import.meta.env.DEV
  ? lazy(() => import("./components/ErrorReporter"))
  : ({ children }: { children: ReactNode }) => <>{children}</>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Wrapper>
        <App />
      </Wrapper>
    </Suspense>
  </StrictMode>,
);
