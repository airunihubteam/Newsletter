/**
 * From identity on the verified Resend domain.
 * CSV sending builds this from RESEND_EMAIL_DOMAIN.
 */
export const SENDERS = [
  {
    email: "newsletter@ruecai.com",
    label: "Newsletter",
    display: "Reichman Entrepreneurship Club <newsletter@ruecai.com>",
  },
] as const;

export type SenderEmail = (typeof SENDERS)[number]["email"];

export function isAllowedSender(email: string): email is SenderEmail {
  return SENDERS.some((sender) => sender.email === email);
}

export function senderDisplay(email: SenderEmail): string {
  const sender = SENDERS.find((item) => item.email === email);
  if (!sender) throw new Error(`Sender not in allowlist: ${email}`);
  return sender.display;
}
