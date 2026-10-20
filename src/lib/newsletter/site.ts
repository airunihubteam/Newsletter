const DEFAULT_ORIGIN = "https://ruecai.com";

export function siteOrigin(): string {
  const configured = process.env.APP_URL?.trim();
  const raw = configured ? configured : DEFAULT_ORIGIN;
  return raw.replace(/\/$/, "");
}

export function issuePath(slug: string): string {
  return `/newsletter/${slug}`;
}

/** Public invite to the club's AI WhatsApp community. */
export const whatsappCommunityUrl = "https://chat.whatsapp.com/FFasDzRPtc71uRaIpH6Z9C?mode=gi_t";
