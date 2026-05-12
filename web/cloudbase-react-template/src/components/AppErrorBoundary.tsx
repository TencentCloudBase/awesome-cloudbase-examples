import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Top-level ErrorBoundary for the App tree.
 *
 * Purpose: stop a single render-time exception (a thrown effect, a missing
 * prop, a bug in a third-party component) from unmounting the whole tree
 * and leaving the user staring at `<div id="root">` empty. We catch it,
 * render a friendly fallback card, and re-throw onto window so the dev
 * ErrorReporter overlay (mounted in a sibling root) still picks it up.
 *
 * This is intentionally NOT the boundary that lives inside ErrorReporter:
 *   - ErrorReporter is dev-only and tree-shaken from prod. Without this
 *     separate boundary, a prod build has zero render-time error
 *     containment.
 *   - Mounting the dev overlay in its own root means the App-tree boundary
 *     can't be inside it; this component fills that gap.
 *
 * Render-time errors only — async errors, event-handler throws, and
 * promise rejections still need the global window/unhandledrejection
 * listeners (which the dev overlay subscribes to).
 */

interface AppErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log so the bug shows up in DevTools Console regardless of any overlay.
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary]", error, info);

    // Re-throw onto window in a microtask so the global error listener (used
    // by the dev ErrorReporter overlay) sees it too. We don't throw
    // synchronously because React would treat it as a recursive boundary
    // failure. setTimeout(..., 0) puts the throw outside React's error path.
    setTimeout(() => {
      throw error;
    }, 0);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f9fafb",
          color: "#111827",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 28, height: 28, color: "#ef4444" }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            页面加载失败
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#6b7280",
            }}
          >
            出错了。你可以试着重试一次,或刷新整个页面。
            <br />
            如果问题持续出现,请联系支持人员。
          </p>
          {/* Surface the error message so users can include it in a bug
              report. Stack is intentionally NOT shown — too noisy for
              non-developers; the dev overlay has the full thing. */}
          <pre
            style={{
              marginTop: 16,
              padding: 10,
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 12,
              color: "#374151",
              textAlign: "left",
              overflow: "auto",
              maxHeight: 120,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message || String(error)}
          </pre>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={this.reset}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              重试
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.reload();
              }}
              style={{
                background: "#ffffff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      </div>
    );
  }
}
