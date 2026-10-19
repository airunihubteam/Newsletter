const DEFAULT_ORIGIN = "https://ruecai.com";

export function siteOrigin(): string {
  const configured = process.env.APP_URL?.trim();
  const raw = configured ? configured : DEFAULT_ORIGIN;
  return raw.replace(/\/$/, "");
}

export function issuePath(slug: string): string {
  return `/newsletter/${slug}`;
}
