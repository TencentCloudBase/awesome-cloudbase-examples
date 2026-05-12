import type { Plugin, ViteDevServer } from "vite";

/**
 * vite-plugin-dev-errors
 * ----------------------------------------------------------------------------
 * Exposes a tiny HTTP surface on the dev server that lets external processes
 * (CI bots, AI evaluators, orchestrators) ask "does the app currently have
 * any compile or runtime errors?" without having to scrape Vite's stdout.
 *
 * HTTP endpoints (only mounted in dev; the plugin is a no-op in build mode):
 *
 *   GET    /__dev_errors
 *     Returns the current error snapshot:
 *       {
 *         ok: boolean,                // true iff both lists are empty
 *         buildErrors: BuildError[],  // server-side transform/resolve failures
 *         runtimeErrors: RuntimeError[], // pushed from the in-page ErrorReporter
 *       }
 *
 *   POST   /__dev_errors/client
 *     Alternative to the HMR channel for non-browser callers (e.g. a CLI
 *     script that already has the error payload in hand). Body: JSON
 *     { source, message, stack?, componentStack?, url?, timestamp, raw? }.
 *     Deduped by (message + first stack line).
 *
 *   DELETE /__dev_errors/client
 *     Clears all runtime errors.
 *
 *   DELETE /__dev_errors/client/:id
 *     Removes a single runtime error by id.
 *
 * HMR WebSocket channel (preferred path from the in-page ErrorReporter):
 *   - `dev-error`       — record one runtime error (same payload shape as POST)
 *   - `dev-error:clear` — wipe all runtime errors
 *
 *   We use the HMR socket instead of plain fetch() because the page is often
 *   served through a proxy / iframe preview gateway whose own origin doesn't
 *   route /__dev_errors/* back to the Vite process. The HMR WebSocket, on the
 *   other hand, must be proxied correctly for HMR to work at all, so we can
 *   piggy-back on it as a guaranteed-reachable bidirectional channel.
 *
 * Build-error lifecycle:
 *   A transform/load failure against file F is stored keyed by F. When F is
 *   later transformed successfully, its entry is removed — i.e. fixing the
 *   offending file silently "resolves" the error without any manual reset.
 *   A recovery transform also sweeps the runtime error buffer, since the
 *   browser's captured errors were likely based on the previously-broken
 *   code and are no longer relevant.
 *
 * Runtime-error lifecycle:
 *   Kept in a bounded ring buffer (MAX_RUNTIME). Deduped by fingerprint.
 *   External consumers either drain via DELETE, or wait for the browser's
 *   next `vite:afterUpdate` to trigger an automatic clear (via the HMR
 *   `dev-error:clear` event), or wait for a server-side "file fixed" signal
 *   to clear the buffer.
 */

const MAX_RUNTIME = 100;

export interface BuildError {
  id: string;
  /** Absolute file path where the error originated, if known. */
  file?: string;
  /** Source: vite:error event, plugin transform exception, etc. */
  source: "vite:error" | "transform" | "plugin";
  message: string;
  stack?: string;
  loc?: { line?: number; column?: number };
  /** Server-side ISO timestamp when the error was first seen. */
  timestamp: number;
}

export interface RuntimeError {
  id: string;
  /** Source as reported by the browser (e.g. "react", "window-error"). */
  source: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp: number;
  count: number;
  // Opaque forwarding of the raw payload posted by the client.
  raw?: unknown;
}

let idSeq = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(++idSeq).toString(36)}`;

function fingerprint(e: { message: string; stack?: string }): string {
  const firstStackLine = e.stack?.split("\n").find((l) => l.trim())?.trim() ?? "";
  return `${e.message}::${firstStackLine}`;
}

export default function devErrorsPlugin(): Plugin {
  // Keyed by file path (or fingerprint if file is unknown) so a fresh error on
  // the same file replaces the stale one, and a successful re-transform clears
  // it automatically.
  const buildErrors = new Map<string, BuildError>();
  // Ring buffer of runtime errors, newest first. Keyed by fingerprint for
  // dedupe + count increments.
  const runtimeByFp = new Map<string, RuntimeError>();
  const runtimeOrder: string[] = []; // fingerprints newest-first

  function recordBuildError(input: Omit<BuildError, "id" | "timestamp">): void {
    const key = input.file ?? fingerprint(input);
    const existing = buildErrors.get(key);
    buildErrors.set(key, {
      id: existing?.id ?? nextId("build"),
      timestamp: existing?.timestamp ?? Date.now(),
      ...input,
    });
  }

  function clearBuildErrorForFile(file: string): boolean {
    return buildErrors.delete(file);
  }

  function clearAllRuntimeErrors(): void {
    runtimeByFp.clear();
    runtimeOrder.length = 0;
  }

  function recordRuntimeError(input: Omit<RuntimeError, "id" | "count">): string {
    const fp = fingerprint(input);
    const existing = runtimeByFp.get(fp);
    if (existing) {
      existing.count += 1;
      existing.timestamp = input.timestamp;
      // Prefer the newer url / componentStack if the previous was missing.
      existing.url = existing.url ?? input.url;
      existing.componentStack = existing.componentStack ?? input.componentStack;
      // Move to front in order list.
      const idx = runtimeOrder.indexOf(fp);
      if (idx > 0) {
        runtimeOrder.splice(idx, 1);
        runtimeOrder.unshift(fp);
      }
      return existing.id;
    }
    const entry: RuntimeError = { ...input, id: nextId("rt"), count: 1 };
    runtimeByFp.set(fp, entry);
    runtimeOrder.unshift(fp);
    // Enforce bound: drop oldest.
    while (runtimeOrder.length > MAX_RUNTIME) {
      const oldest = runtimeOrder.pop();
      if (oldest) runtimeByFp.delete(oldest);
    }
    return entry.id;
  }

  return {
    name: "dev-errors",
    apply: "serve",

    configureServer(server: ViteDevServer) {
      // Hook HMR error stream — covers HMR-time update failures.
      server.hot.on("vite:error", (payload: { err?: { message?: string; stack?: string; loc?: { line?: number; column?: number }; id?: string } }) => {
        const err = payload?.err;
        if (!err) return;
        recordBuildError({
          source: "vite:error",
          message: err.message ?? "Unknown Vite error",
          stack: err.stack,
          loc: err.loc,
          file: err.id,
        });
      });

      // Client-side runtime errors pushed over the HMR WebSocket. The in-
      // page ErrorReporter uses `import.meta.hot.send("dev-error", …)`; we
      // receive it here. This channel is used instead of plain HTTP POST
      // because the dev server may be behind a proxy / iframe preview
      // gateway where a relative fetch doesn't route back here — but the
      // HMR socket has to be proxied correctly for HMR to work at all.
      server.hot.on(
        "dev-error",
        (
          payload: Partial<RuntimeError> & { message?: string },
        ) => {
          if (!payload || typeof payload.message !== "string") return;
          recordRuntimeError({
            source: payload.source ?? "unknown",
            message: payload.message,
            stack: payload.stack,
            componentStack: payload.componentStack,
            url: payload.url,
            timestamp:
              typeof payload.timestamp === "number"
                ? payload.timestamp
                : Date.now(),
            raw: payload.raw,
          });
        },
      );

      // Companion clear event — the browser sends this after a successful
      // HMR update (vite:afterUpdate) so external GET consumers see a fresh
      // state that matches "app is healthy now".
      server.hot.on("dev-error:clear", () => {
        clearAllRuntimeErrors();
      });

      // Plugin transform / parse errors surface via server.ws.send({ type:
      // 'error', err }) when any client is connected, or — if no client is
      // connected yet — purely as logger.error output. We intercept both so
      // the endpoint works regardless of whether a browser is attached.

      // 1) Wrap ws.send to sniff error payloads.
      const origWsSend = server.ws.send.bind(server.ws);
      server.ws.send = ((...args: unknown[]) => {
        const payload = args[0] as {
          type?: string;
          err?: {
            message?: string;
            stack?: string;
            loc?: { line?: number; column?: number; file?: string };
            id?: string;
            plugin?: string;
          };
        };
        if (payload && payload.type === "error" && payload.err) {
          const err = payload.err;
          recordBuildError({
            source: err.plugin ? "plugin" : "transform",
            message: err.message ?? "Unknown build error",
            stack: err.stack,
            loc: err.loc,
            file: err.loc?.file ?? err.id,
          });
        }
        return origWsSend(...(args as Parameters<typeof origWsSend>));
      }) as typeof server.ws.send;

      // 2) Wrap logger.error. Vite prints transform errors with an { error }
      //    option carrying the original error object (see Logger's
      //    "Internal server error" path). We record from there for the case
      //    where no HMR client is connected yet.
      const origLoggerError = server.config.logger.error.bind(
        server.config.logger,
      );
      server.config.logger.error = ((
        msg: string,
        options?: { error?: Error & { loc?: { line?: number; column?: number; file?: string }; id?: string; plugin?: string } },
      ) => {
        const err = options?.error;
        if (err) {
          recordBuildError({
            source: err.plugin ? "plugin" : "transform",
            message: err.message ?? msg,
            stack: err.stack,
            loc: err.loc,
            file: err.loc?.file ?? err.id,
          });
        }
        return origLoggerError(msg, options);
      }) as typeof server.config.logger.error;

      // HTTP endpoints. Mounted WITHOUT a path prefix so they respond under
      // both `/__dev_errors` (local direct connection) AND `{base}/__dev_errors`
      // (when Vite is started with --base /preview/.../ behind a proxy that
      // only forwards that path). Inside the handler we strip the base and
      // match against the resulting suffix. This means callers never have to
      // know whether --base is set: they just append `/__dev_errors` to the
      // same origin they fetch the app from.
      const base = server.config.base.replace(/\/$/, ""); // "" or "/preview/5179"
      server.middlewares.use(async (req, res, next) => {
        const method = req.method ?? "GET";
        const rawUrl = req.url ?? "/";
        // Strip query string for matching.
        const [pathOnly] = rawUrl.split("?");
        // Strip the configured base prefix if present, so we can match the
        // remaining tail as if base were "/".
        const path =
          base && pathOnly.startsWith(base)
            ? pathOnly.slice(base.length) || "/"
            : pathOnly;

        // Only handle our own paths; everything else falls through to the
        // normal Vite middleware chain (SPA fallback, /src transforms, etc).
        if (!path.startsWith("/__dev_errors")) return next();

        // --- GET /__dev_errors — full snapshot ---
        if (
          method === "GET" &&
          (path === "/__dev_errors" || path === "/__dev_errors/")
        ) {
          const build = Array.from(buildErrors.values()).sort(
            (a, b) => b.timestamp - a.timestamp,
          );
          const runtime = runtimeOrder
            .map((fp) => runtimeByFp.get(fp))
            .filter((e): e is RuntimeError => !!e);
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(
            JSON.stringify(
              {
                ok: build.length === 0 && runtime.length === 0,
                buildErrors: build,
                runtimeErrors: runtime,
              },
              null,
              2,
            ),
          );
          return;
        }

        // --- DELETE /__dev_errors/client — clear all runtime errors ---
        if (method === "DELETE" && path === "/__dev_errors/client") {
          clearAllRuntimeErrors();
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        // Path prefix matched but not a recognized endpoint — 404 explicitly
        // so callers get a clear signal rather than the SPA HTML fallback.
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, error: "Not found" }));
      });
    },

    // Rollup-level transform hook: both fires for plugin errors and tracks
    // when a file successfully transforms (i.e. recovered from an earlier
    // failure).
    transform: {
      order: "post",
      handler(_code, id) {
        // Successful transform → forget any prior build error for this file.
        // If the file had previously been broken, treat this moment as a
        // "file fixed" signal and also sweep the runtime error buffer —
        // errors captured by the browser while the app was in a bad state
        // are likely stale now, and an external consumer polling GET
        // /__dev_errors shouldn't still see them after the fix is in. This
        // complements the browser-side vite:afterUpdate cleanup (which
        // requires an active browser session); this path works even when
        // no browser is connected, e.g. a CI runner just doing `curl`.
        const hadError = clearBuildErrorForFile(id);
        if (hadError) clearAllRuntimeErrors();
        return null;
      },
    },

    // If another plugin throws in its own transform, Vite calls this. We
    // capture the failure and re-throw so normal error handling continues.
    async handleHotUpdate(ctx) {
      // No-op — the vite:error handler above already captures HMR failures.
      // This hook exists purely to keep a reference path for future tuning.
      return ctx.modules;
    },
  };
}
