export function isAllowedOrigin(origin: string | null, allow: string[], previewPattern?: RegExp): boolean {
  if (!origin) return false;
  if (allow.includes(origin)) return true;
  return previewPattern ? previewPattern.test(origin) : false;
}

export function allowedOrigins(): string[] {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return [site, "https://itsrellestate.com", "https://www.itsrellestate.com"]
    .filter((v): v is string => !!v);
}

export const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
