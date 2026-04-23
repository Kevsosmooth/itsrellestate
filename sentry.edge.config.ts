import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
  beforeSend(event) {
    if (event.request?.data) {
      event.request.data = "[Filtered]";
    }
    return event;
  },
});
