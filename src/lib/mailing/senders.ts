/**
 * Allowed From identities once the club domain is verified in Resend.
 * CSV sending currently uses the MAIL_FROM environment variable.
 */
export const SENDERS = [
  {
    email: "newsletter@mail.example.com",
    label: "Newsletter",
    display: "Reichman Entrepreneurship Club <newsletter@mail.example.com>",
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
