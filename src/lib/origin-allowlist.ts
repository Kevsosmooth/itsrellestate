// Local dev + private-LAN origins (localhost, 127.x, 192.168.x, 10.x, 172.16-31.x).
// Safe to always allow: a remote attacker's page carries a PUBLIC origin (which
// is blocked); these only appear when a developer opens the app from their own
// machine or LAN (e.g. the NAS LAN IP). Without this, local/LAN submissions 403.
const LOCAL_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isAllowedOrigin(origin: string | null, allow: string[], previewPattern?: RegExp): boolean {
  if (!origin) return false;
  if (LOCAL_ORIGIN.test(origin)) return true;
  if (allow.includes(origin)) return true;
  return previewPattern ? previewPattern.test(origin) : false;
}

export function allowedOrigins(): string[] {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return [site, "https://itsrellestate.com", "https://www.itsrellestate.com"]
    .filter((v): v is string => !!v);
}

export const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
