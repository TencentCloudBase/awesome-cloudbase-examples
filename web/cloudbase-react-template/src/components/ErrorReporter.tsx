import { Component, type ErrorInfo, type ReactNode, useEffect, useRef, useState } from "react";

/**
 * ErrorReporter
 * ----------------------------------------------------------------------------
 * Captures four classes of errors that can occur in the preview iframe and
 * exposes a "Send error" button that postMessages a selected error to the
 * parent window. The most recent N errors (see `MAX_ERRORS`) are retained so
 * the user can scroll through and re-send any of them. The panel can be
 * collapsed into a small badge to stay out of the way.
 *
 * Sources captured:
 *   1. React render-time errors        → ErrorBoundary (componentDidCatch)
 *   2. Uncaught runtime errors         → window.addEventListener("error")
 *   3. Unhandled promise rejections    → window.addEventListener("unhandledrejection")
 *   4. Vite HMR / compile errors       → import.meta.hot.on("vite:error")
 *
 * postMessage protocol (iframe → parent)
 * ─────────────────────────────────────
 * All messages share a common envelope:
 *   { type: PreviewMessageType, timestamp: number, ...payload }
 *
 * Types emitted:
 *   "preview:error"             — runtime / compile error (manual Send button OR
 *                                 auto-sent for build errors)
 *   "preview:build:error"       — compile error, sent automatically without user interaction
 *   "preview:build:cleared"     — previously-reported build error was resolved
 *   "preview:hmr:connected"     — HMR WebSocket established
 *   "preview:hmr:disconnected"  — HMR WebSocket closed / errored
 *   "preview:hmr:reconnecting"  — HMR client is attempting to reconnect the socket
 *   "preview:hmr:update-start"  — HMR patch application began
 *   "preview:hmr:update-done"   — HMR patch applied successfully
 *   "preview:ready"             — React tree mounted for the first time
 *   "preview:url-changed"       — in-page route change (pushState / popstate)
 *   "preview:pong"              — response to a "platform:ping" heartbeat
 *
 * postMessage protocol (parent → iframe)
 * ─────────────────────────────────────
 * Fire-and-forget actions (no response):
 *   "platform:reload"            — force a full page reload
 *   "platform:navigate"          — { path: string } push a client-side route
 *   "platform:navigate-back"     — history.back()
 *   "platform:navigate-forward"  — history.forward()
 *
 * RPC actions (expect a "preview:call-result" response):
 *   "platform:ping" — { requestId: string } heartbeat; iframe replies with
 *       { type: "preview:call-result", requestId, ok: true, value: null }
 *   "platform:call" — { requestId: string, command: "eval", args: [code: string] }
 *     Evaluates `code` in the iframe's global scope via new Function() and replies:
 *       { type: "preview:call-result", requestId, ok: true,  value: <serialized> }
 *       { type: "preview:call-result", requestId, ok: false, error: <message> }
 *     The caller should associate requestId with a pending Promise and apply a
 *     timeout, e.g.:
 *       const result = await Promise.race([rpc("eval", "document.title"), timeout(3000)])
 */

export type CapturedErrorSource =
  | "react"
  | "window-error"
  | "unhandled-rejection"
  | "vite-hmr";

export interface CapturedError {
  id: string;
  source: CapturedErrorSource;
  message: string;
  stack?: string;
  componentStack?: string;
  raw?: unknown;
  timestamp: number;
  /** Number of times this error fingerprint has been seen (≥1). */
  count: number;
}

// ─── postMessage type registry ───────────────────────────────────────────────

export type PreviewMessageType =
  | "preview:error"
  | "preview:build:error"
  | "preview:build:cleared"
  | "preview:hmr:connected"
  | "preview:hmr:disconnected"
  | "preview:hmr:reconnecting"
  | "preview:hmr:update-start"
  | "preview:hmr:update-done"
  | "preview:ready"
  | "preview:url-changed"
  | "preview:call-result";

export type PlatformMessageType =
  | "platform:ping"
  | "platform:reload"
  | "platform:navigate"
  | "platform:navigate-back"
  | "platform:navigate-forward"
  | "platform:call";

// "*" for now — the parent window is the CloudBase preview gateway and the
// exact origin isn't pinned down yet. Tighten this later when the protocol is
// finalized.
const POST_MESSAGE_TARGET_ORIGIN = "*";
const MAX_ERRORS = 5;

let errorIdSeq = 0;
const nextErrorId = () => `err-${Date.now().toString(36)}-${(++errorIdSeq).toString(36)}`;

/**
 * Send a typed event message to the parent window.
 * No-op when running outside an iframe (window.parent === window).
 */
function postToParent(type: PreviewMessageType, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined" || window.parent === window) return;
  try {
    window.parent.postMessage(
      { type, timestamp: Date.now(), ...payload },
      POST_MESSAGE_TARGET_ORIGIN,
    );
  } catch {
    // Structured-clone failure — omit non-cloneable fields and retry once.
    try {
      window.parent.postMessage({ type, timestamp: Date.now() }, POST_MESSAGE_TARGET_ORIGIN);
    } catch {
      /* silent */
    }
  }
}

/**
 * Send a "preview:call-result" RPC response back to the platform.
 * Always includes the original requestId so the caller can resolve its Promise.
 */
function replyCallResult(
  requestId: string,
  result: { ok: true; value: unknown } | { ok: false; error: string },
): void {
  if (typeof window === "undefined" || window.parent === window) return;
  try {
    window.parent.postMessage(
      { type: "preview:call-result", requestId, timestamp: Date.now(), ...result },
      POST_MESSAGE_TARGET_ORIGIN,
    );
  } catch {
    // value may not be structured-cloneable (e.g. a DOM node, a function).
    // Fall back to a stringified version so the caller still gets something useful.
    const fallbackValue = result.ok
      ? (() => { try { return JSON.stringify(result.value); } catch { return String(result.value); } })()
      : undefined;
    try {
      window.parent.postMessage(
        {
          type: "preview:call-result",
          requestId,
          timestamp: Date.now(),
          ok: result.ok,
          ...(result.ok ? { value: fallbackValue } : { error: result.error }),
        },
        POST_MESSAGE_TARGET_ORIGIN,
      );
    } catch {
      /* silent */
    }
  }
}

/**
 * Execute arbitrary JS code in the iframe's global scope and return the result.
 * Uses `new Function()` rather than `eval` so the code runs in non-strict mode
 * by default and has access to the global `window`. Both are equivalent from a
 * CSP perspective — `unsafe-eval` is required for either to work.
 *
 * The return value is whatever the last expression evaluates to. Async code is
 * supported: if the function returns a Promise, the caller awaits it.
 *
 * Errors (syntax errors, runtime throws, rejected promises) are caught and
 * reported as { ok: false, error: message } so the platform always gets a
 * structured response rather than a hanging Promise.
 */
async function execCode(code: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    // Wrap in an async IIFE so top-level await works and the return value is
    // always a Promise regardless of whether the code itself is async.
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (async () => { ${code} })()`);
    const value = await fn();
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Fingerprint intentionally omits `source` so the React→window-error rethrow
 * pair collapses into one entry. Includes only the first stack line to stay
 * stable across minor frame churn. There is no time window — duplicates are
 * merged regardless of when they occur, and the merged entry is moved to the
 * top of the list so the most recently triggered error is always first.
 */
function fingerprint(err: Pick<CapturedError, "message" | "stack">): string {
  const firstStackLine = err.stack?.split("\n").find((l) => l.trim())?.trim() ?? "";
  return `${err.message}::${firstStackLine}`;
}

function postErrorToParent(err: CapturedError) {
  postToParent("preview:error", {
    source: err.source,
    message: err.message,
    stack: err.stack,
    componentStack: err.componentStack,
    url: typeof location !== "undefined" ? location.href : undefined,
    raw: err.raw,
  });
}

/**
 * Push a captured error to the dev server via the HMR WebSocket. This is the
 * ONLY reliably-reachable channel from the in-page runtime back to the Vite
 * process: plain `fetch("/__dev_errors/client")` breaks whenever the page is
 * served through a proxy / iframe preview gateway (the request ends up at
 * the proxy's origin, not the dev server's). The HMR socket, on the other
 * hand, has to be proxied correctly for HMR itself to work, so we can piggy-
 * back on it.
 *
 * The server-side listener lives in `vite-plugin-dev-errors.ts`
 * (`server.hot.on("dev-error", ...)`).
 *
 * No-op outside dev — `import.meta.hot` is `undefined` in production builds
 * and the whole code path is dead-code eliminated by Vite's define plugin.
 */
function postErrorToDevServer(
  err: Pick<
    CapturedError,
    "source" | "message" | "stack" | "componentStack" | "timestamp" | "raw"
  >,
): void {
  if (!import.meta.hot) return;
  try {
    import.meta.hot.send("dev-error", {
      source: err.source,
      message: err.message,
      stack: err.stack,
      componentStack: err.componentStack,
      url: typeof location !== "undefined" ? location.href : undefined,
      timestamp: err.timestamp,
      raw: err.raw,
    });
  } catch {
    /* silent — stale socket, etc. */
  }
}

/**
 * Ask the dev server to clear all client-side runtime errors it has on file.
 * Mirrors `postErrorToDevServer` — goes over the HMR socket, not HTTP.
 */
function clearDevServerRuntimeErrors(): void {
  if (!import.meta.hot) return;
  try {
    import.meta.hot.send("dev-error:clear", {});
  } catch {
    /* silent */
  }
}

/* -------------------------------------------------------------------------- */
/* React ErrorBoundary                                                         */
/* -------------------------------------------------------------------------- */

interface BoundaryProps {
  onError: (err: Omit<CapturedError, "id" | "count">) => void;
  children: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class ReactErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError({
      source: "react",
      message: error.message || String(error),
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      raw: { name: error.name },
      timestamp: Date.now(),
    });
  }

  handleReset = () => {
    // Reset the boundary so children re-mount. If the underlying issue isn't
    // fixed the next render will throw again and we land back here — that's
    // fine; a transient error (e.g. flaky network) often recovers on retry.
    this.setState({ hasError: false });
  };

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Friendly fallback. Sized to fit inside the existing layout slot rather
      // than blanking the whole viewport, so surrounding chrome (Navbar /
      // Footer) stays visible and the floating ErrorReporter panel can render
      // on top of everything else.
      return (
        <div className="flex min-h-[320px] items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 text-red-500"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              页面遇到了一个问题
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              抱歉,这部分内容无法正常显示。你可以重试一次,或刷新页面。
              <br />
              如果问题持续出现,请点击右下角的浮层将错误上报给我们。
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                重试
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* ErrorReporter                                                               */
/* -------------------------------------------------------------------------- */

interface ErrorReporterProps {
  /**
   * Children rendered inside an ErrorBoundary. Optional: when ErrorReporter
   * is mounted into its own root (see `bootstrap-error-reporter.tsx`) it
   * has no app tree to wrap — it's just the floating panel observing
   * window-level errors. Pass children only when you want it to also
   * catch React render errors in the wrapped subtree.
   */
  children?: ReactNode;
}

export default function ErrorReporter({ children }: ErrorReporterProps) {
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  // Floating position. `null` = default placement (bottom-right corner).
  // Once the user drags, switches to absolute {x, y} pixel coordinates.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // Begin drag from any element flagged with data-drag-handle (the panel
  // header strip and the collapsed badge). Buttons inside the header don't
  // get this attribute so they keep working normally.
  const onDragStart = (e: React.MouseEvent<HTMLElement>) => {
    const handleEl = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-drag-handle]",
    );
    if (!handleEl) return;
    // Resolve the element being dragged (the floating panel/badge itself,
    // marked with data-drag-root).
    const rootEl = handleEl.closest<HTMLElement>("[data-drag-root]");
    if (!rootEl) return;
    const rect = rootEl.getBoundingClientRect();
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
      moved: false,
    };
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startMouseX;
      const dy = ev.clientY - d.startMouseY;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 3) return; // tiny jitter
      d.moved = true;
      const w = rootEl.offsetWidth;
      const h = rootEl.offsetHeight;
      // Clamp to viewport so the panel can't be lost off-screen.
      const nx = Math.max(0, Math.min(window.innerWidth - w, d.startX + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - h, d.startY + dy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Keep dragRef.current.moved around so the immediately-following click
      // on the badge can read it (see badge onClick below). Cleared on the
      // next dragstart anyway.
      setTimeout(() => {
        dragRef.current = null;
      }, 0);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Style helper: returns either default-corner positioning or absolute pos.
  const floatingPos = (): React.CSSProperties =>
    pos
      ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
      : { right: 16, bottom: 16 };

  const record = (incoming: Omit<CapturedError, "id" | "count">) => {
    const fp = fingerprint(incoming);
    setErrors((prev) => {
      // Dedupe against entries currently in the list. Sent entries are
      // removed entirely (see handleSend), so anything still here is unsent
      // and free to merge with.
      const existingIdx = prev.findIndex((e) => fingerprint(e) === fp);
      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        const merged: CapturedError = {
          ...existing,
          // Prefer the richer payload from the new occurrence (it may carry
          // a componentStack the original lacked, e.g. the React→window pair).
          componentStack: existing.componentStack ?? incoming.componentStack,
          stack: existing.stack ?? incoming.stack,
          // Newest occurrence wins on timestamp so the row sorts to the top.
          timestamp: incoming.timestamp,
          count: existing.count + 1,
        };
        const next = prev.slice();
        next.splice(existingIdx, 1);
        return [merged, ...next];
      }
      const next: CapturedError[] = [
        { ...incoming, id: nextErrorId(), count: 1 },
        ...prev,
      ];
      return next.length > MAX_ERRORS ? next.slice(0, MAX_ERRORS) : next;
    });
    // A new error always re-opens the panel so the user notices.
    setCollapsed(false);
    // eslint-disable-next-line no-console
    console.error(`[ErrorReporter:${incoming.source}]`, incoming.message, incoming);
    // Mirror to the dev server's error collector endpoint so external tools
    // polling GET /__dev_errors see this error without needing a parent-
    // window postMessage bridge. The server dedupes by fingerprint too.
    postErrorToDevServer(incoming);
  };

  useEffect(() => {
    // ── preview:ready: signal parent that the React tree is up ─────────────
    postToParent("preview:ready", {
      url: typeof location !== "undefined" ? location.href : undefined,
    });

    // ── Hydrate from dev server snapshot ────────────────────────────────────
    // vite:error is a one-shot push — if the offending file was already
    // transformed (and failed) before our listener attached, we'd miss it
    // on every page load after the first. The plugin keeps a persistent
    // buildError map keyed by file, so we just GET it on mount and seed our
    // local state.
    let cancelled = false;
    if (import.meta.hot) {
      const base = import.meta.env.BASE_URL || "/";
      // Trim trailing slash before joining so we don't end up with `//`.
      const url = `${base.replace(/\/$/, "")}/__dev_errors`;
      fetch(url, { headers: { Accept: "application/json" } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { buildErrors?: Array<{ message: string; stack?: string; file?: string; loc?: { line?: number; column?: number }; timestamp?: number }> } | null) => {
          if (cancelled || !data?.buildErrors?.length) return;
          for (const be of data.buildErrors) {
            record({
              source: "vite-hmr",
              message: be.message,
              stack: be.stack,
              raw: { file: be.file, loc: be.loc },
              timestamp: typeof be.timestamp === "number" ? be.timestamp : Date.now(),
            });
          }
        })
        .catch(() => {
          /* silent — endpoint not reachable, nothing to do */
        });
    }

    const onError = (e: ErrorEvent) => {
      record({
        source: "window-error",
        message: e.message || (e.error?.message ?? "Unknown error"),
        stack: e.error?.stack,
        raw: {
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        },
        timestamp: Date.now(),
      });
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : (() => {
                try {
                  return JSON.stringify(reason);
                } catch {
                  return String(reason);
                }
              })();
      record({
        source: "unhandled-rejection",
        message: message || "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
        timestamp: Date.now(),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // ── Vite HMR events ─────────────────────────────────────────────────────
    let offViteError: (() => void) | undefined;
    let offViteAfterUpdate: (() => void) | undefined;
    let offViteBeforeUpdate: (() => void) | undefined;
    let offWsConnect: (() => void) | undefined;
    let offWsDisconnect: (() => void) | undefined;

    if (import.meta.hot) {
      // Compile errors → record locally AND auto-post to parent immediately
      // (no user interaction required for build errors).
      const viteErrorHandler = (payload: { err?: { message?: string; stack?: string } }) => {
        const err = {
          source: "vite-hmr" as CapturedErrorSource,
          message: payload?.err?.message || "Vite compile error",
          stack: payload?.err?.stack,
          raw: payload,
          timestamp: Date.now(),
        };
        record(err);
        // Auto-forward build errors to the parent — the platform can show
        // an inline error banner without waiting for the user to click Send.
        postToParent("preview:build:error", {
          message: err.message,
          stack: err.stack,
        });
      };
      import.meta.hot.on("vite:error", viteErrorHandler);
      offViteError = () => import.meta.hot?.off("vite:error", viteErrorHandler);

      // A successful HMR update means the app is now running fresh code.
      const afterUpdateHandler = () => {
        clearDevServerRuntimeErrors();
        postToParent("preview:hmr:update-done");
        // Notify parent that any previously-reported build errors are resolved.
        postToParent("preview:build:cleared");
      };
      import.meta.hot.on("vite:afterUpdate", afterUpdateHandler);
      offViteAfterUpdate = () =>
        import.meta.hot?.off("vite:afterUpdate", afterUpdateHandler);

      // HMR patch is about to be applied — let the platform show a progress indicator.
      const beforeUpdateHandler = () => {
        postToParent("preview:hmr:update-start");
      };
      import.meta.hot.on("vite:beforeUpdate", beforeUpdateHandler);
      offViteBeforeUpdate = () =>
        import.meta.hot?.off("vite:beforeUpdate", beforeUpdateHandler);

      // WebSocket connection state — Vite 5.1+ emits these events.
      // We guard with optional chaining for older Vite versions.
      const wsConnectHandler = () => {
        postToParent("preview:hmr:connected");
      };
      const wsDisconnectHandler = () => {
        postToParent("preview:hmr:disconnected");
      };
      // "vite:ws:connect" / "vite:ws:disconnect" were introduced in Vite 5.1.
      // The hot.on call is safe on earlier versions — Vite simply never fires
      // the event — so no version guard is needed here.
      import.meta.hot.on("vite:ws:connect", wsConnectHandler);
      import.meta.hot.on("vite:ws:disconnect", wsDisconnectHandler);
      offWsConnect = () => import.meta.hot?.off("vite:ws:connect", wsConnectHandler);
      offWsDisconnect = () => import.meta.hot?.off("vite:ws:disconnect", wsDisconnectHandler);
    }

    // ── Route change tracking ────────────────────────────────────────────────
    // Fires on both History API navigation (pushState/replaceState wrapped
    // by frameworks) and the browser's native popstate.
    const onPopState = () => {
      postToParent("preview:url-changed", {
        url: typeof location !== "undefined" ? location.href : undefined,
        path: typeof location !== "undefined" ? location.pathname + location.search + location.hash : undefined,
      });
    };
    window.addEventListener("popstate", onPopState);

    // Patch history.pushState / replaceState so SPA navigations are caught.
    // We restore the originals on cleanup.
    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      origPushState(...args);
      postToParent("preview:url-changed", {
        url: typeof location !== "undefined" ? location.href : undefined,
        path: typeof location !== "undefined" ? location.pathname + location.search + location.hash : undefined,
      });
    };
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      origReplaceState(...args);
      // replaceState doesn't change the visible route in a meaningful way for
      // the platform (it's often used for scroll restoration or minor state
      // updates), but we still emit so the parent has a complete picture.
      postToParent("preview:url-changed", {
        url: typeof location !== "undefined" ? location.href : undefined,
        path: typeof location !== "undefined" ? location.pathname + location.search + location.hash : undefined,
      });
    };

    // ── Inbound platform messages ────────────────────────────────────────────
    const onPlatformMessage = (e: MessageEvent) => {
      // Accept messages from any origin while the protocol is being defined.
      // Tighten to a specific origin once it is stable.
      const data = e.data as {
        type?: PlatformMessageType;
        path?: string;
        requestId?: string;
        command?: string;
        args?: unknown[];
      } | null;
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "platform:ping": {
          // Heartbeat RPC — reply with requestId so the platform can measure
          // RTT and match concurrent pings.
          const requestId = data.requestId;
          if (typeof requestId === "string") {
            replyCallResult(requestId, { ok: true, value: null });
          }
          break;
        }

        case "platform:reload":
          // Platform wants a full page reload (e.g. after an env var change).
          if (typeof window !== "undefined") window.location.reload();
          break;

        case "platform:navigate":
          // Platform wants to drive the iframe to a specific client-side route.
          // We use history.pushState (the original, pre-patched version) so
          // that we don't re-emit "preview:url-changed" back to the platform and
          // create a loop.
          if (typeof data.path === "string" && data.path) {
            origPushState(null, "", data.path);
            // Dispatch a popstate so React Router / TanStack Router / etc. picks
            // up the navigation.
            window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
          }
          break;

        case "platform:navigate-back":
          history.back();
          break;

        case "platform:navigate-forward":
          history.forward();
          break;

        case "platform:call": {
          // RPC: execute code and reply with the result.
          // Only "eval" command is supported for now; the command field is kept
          // for future extensibility (e.g. "screenshot", "getState", etc.).
          const requestId = data.requestId;
          if (typeof requestId !== "string") break; // malformed — no way to reply
          if (data.command !== "eval") {
            replyCallResult(requestId, { ok: false, error: `Unknown command: ${data.command}` });
            break;
          }
          const code = Array.isArray(data.args) && typeof data.args[0] === "string"
            ? data.args[0]
            : "";
          if (!code) {
            replyCallResult(requestId, { ok: false, error: "platform:call eval requires args[0] to be a non-empty string" });
            break;
          }
          // execCode is async; we fire-and-forget the Promise here because
          // onPlatformMessage itself is synchronous. The reply arrives whenever
          // the code finishes (or rejects).
          execCode(code).then((result) => replyCallResult(requestId, result));
          break;
        }

        default:
          break;
      }
    };
    window.addEventListener("message", onPlatformMessage);

    return () => {
      cancelled = true;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("message", onPlatformMessage);
      // Restore original history methods.
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
      offViteError?.();
      offViteAfterUpdate?.();
      offViteBeforeUpdate?.();
      offWsConnect?.();
      offWsDisconnect?.();
    };
  }, []);

  const handleSend = (err: CapturedError) => {
    postErrorToParent(err);
    // Remove the entry once sent — the parent is non-idempotent so we don't
    // want to risk re-sending. Future occurrences with the same fingerprint
    // will create a fresh row that the user can send again.
    setErrors((prev) => prev.filter((e) => e.id !== err.id));
  };

  const handleSendAll = () => {
    if (errors.length === 0) return;
    // Send oldest-first so the parent receives them in chronological order
    // (the in-memory list is newest-first for display).
    for (let i = errors.length - 1; i >= 0; i--) {
      postErrorToParent(errors[i]);
    }
    setErrors([]);
  };

  const handleDismissAll = () => {
    setErrors([]);
    setCollapsed(false);
  };

  const handleDismissOne = (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  // Wrap children in an ErrorBoundary only when there are children to wrap.
  // The standalone-mount variant (no children) just runs as a side-effect
  // listener + floating UI.
  const wrapChildren = (node: ReactNode): ReactNode =>
    children !== undefined ? (
      <ReactErrorBoundary onError={record}>{node}</ReactErrorBoundary>
    ) : (
      node
    );

  if (errors.length === 0) {
    return <>{wrapChildren(children)}</>;
  }

  // Collapsed view: just a small red badge with the error count. Click to expand.
  if (collapsed) {
    return (
      <>
        {wrapChildren(children)}
        <button
          type="button"
          data-drag-root
          data-drag-handle
          onMouseDown={onDragStart}
          onClick={() => {
            // Suppress the click that follows a drag.
            if (dragRef.current?.moved) return;
            setCollapsed(false);
          }}
          aria-label={`展开错误面板 (${errors.length})`}
          title={`${errors.length} 个错误 — 拖动可移动,点击展开`}
          style={{
            position: "fixed",
            ...floatingPos(),
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#1f2937",
            color: "#f9fafb",
            border: "none",
            borderRadius: 999,
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            padding: "6px 12px",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
            }}
          />
          {errors.length} error{errors.length > 1 ? "s" : ""}
        </button>
      </>
    );
  }

  return (
    <>
      {wrapChildren(children)}
      <div
        role="alert"
        aria-live="polite"
        data-drag-root
        style={{
          position: "fixed",
          ...floatingPos(),
          zIndex: 2147483647,
          width: 380,
          maxWidth: "calc(100vw - 32px)",
          background: "#1f2937",
          color: "#f9fafb",
          borderRadius: 8,
          boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          padding: 12,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <div
          data-drag-handle
          onMouseDown={onDragStart}
          title="按住可拖动"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600 }}>
            预览捕获到错误 ({errors.length}/{MAX_ERRORS})
          </span>
          <button
            type="button"
            onClick={handleSendAll}
            title={
              errors.length > 1
                ? `上报 ${errors.length} 个错误`
                : "上报错误"
            }
            style={{
              marginLeft: "auto",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {errors.length > 1 ? `Send all (${errors.length})` : "Send"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="最小化"
            title="最小化"
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            –
          </button>
          <button
            type="button"
            onClick={handleDismissAll}
            aria-label="关闭全部"
            title="清空所有错误"
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 8,
            maxHeight: 280,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {errors.map((err) => {
            return (
              <div
                key={err.id}
                style={{
                  background: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#9ca3af",
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#fbbf24" }}>{err.source}</span>
                  {err.count > 1 && (
                    <span
                      title={`此错误已出现 ${err.count} 次`}
                      style={{
                        background: "#7f1d1d",
                        color: "#fecaca",
                        borderRadius: 999,
                        padding: "0 6px",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      ×{err.count}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto" }}>
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    maxHeight: 64,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#e5e7eb",
                  }}
                >
                  {err.message}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleDismissOne(err.id)}
                    style={{
                      background: "transparent",
                      color: "#9ca3af",
                      border: "1px solid #374151",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(err)}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
