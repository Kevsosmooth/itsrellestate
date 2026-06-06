import * as Sentry from "@sentry/nextjs";

// Loads the server/edge Sentry configs at runtime. Without this file the
// sentry.server.config.ts / sentry.edge.config.ts inits never run, so no
// server-side or middleware errors are reported. Required by @sentry/nextjs
// v8.28+ on Next.js 15/16.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown out of Server Components, route handlers, middleware,
// and the edge runtime (e.g. a future middleware failure) — the broad safety net.
export const onRequestError = Sentry.captureRequestError;
