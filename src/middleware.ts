import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// timeout: if the Redis round-trip exceeds this, the limiter resolves as
// success (fail open) instead of hanging. Paired with the try/catch in the
// handler below, this guarantees a rate-limiter outage can never take down
// the application form.
const formLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "itsrellestate:form",
  timeout: 3000,
});

// 300 req/60 s per IP: 1 session mint + ~7 chunk POSTs + 1 verify per file,
// times several files per application — stays well under for a normal applicant
// while blocking abuse. Fail-open (timeout: 3000) so a Redis outage never
// blocks legitimate uploads.
const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, "60 s"),
  prefix: "itsrellestate:upload",
  timeout: 3000,
});

function getIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  const ip = getIP(request);
  const isUpload = pathname.startsWith("/api/upload");
  const limiter = isUpload ? uploadLimiter : formLimiter;

  // Fail OPEN: if the rate-limit check throws (Redis unreachable, over its
  // request quota, or paused), let the request through instead of returning
  // a 500 to every applicant. A shared Upstash DB hit its request cap on
  // 2026-06-06 and silently broke every submission for weeks. The limiter is
  // a protective layer; it must degrade gracefully, never become a single
  // point of total failure for the application form.
  let result: Awaited<ReturnType<typeof limiter.limit>>;
  try {
    result = await limiter.limit(ip);
  } catch (err) {
    console.error("[middleware] rate-limit check failed; allowing request:", err);
    return NextResponse.next();
  }

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
          "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/apply/:path*", "/api/upload/:path*"],
};
