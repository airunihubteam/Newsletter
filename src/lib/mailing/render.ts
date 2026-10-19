export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainText(value: string): string {
  return value.replace(/[\r\n\t]/g, " ").trim();
}

/** Replaces {{firstName}} and {{firstName|Friend}}. Values are escaped for HTML. */
export function applyTokens(template: string, firstName: string | null, asHtml: boolean): string {
  return template.replace(/\{\{\s*firstName(?:\|([^}]*))?\s*\}\}/g, (_match, fallback: string | undefined) => {
    const raw = plainText(firstName ?? "") || plainText(fallback ?? "") || "there";
    return asHtml ? escapeHtml(raw) : raw;
  });
}

const FOOTER = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;text-align:center;">
<p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;font-family:Arial,sans-serif;">
Reichman Entrepreneurship Club<br>
To stop receiving these emails, reply to this message with the word “unsubscribe”.
</p>
</div>`;

/** Wraps campaign HTML in a fixed footer. The footer is not a template system. */
export function renderEmail(html: string, firstName: string | null): string {
  const body = applyTokens(html, firstName, true);
  if (/<\/body>/i.test(body)) {
    return body.replace(/<\/body>/i, `${FOOTER}</body>`);
  }
  return `<!DOCTYPE html><html lang="en"><body>${body}${FOOTER}</body></html>`;
}

export function fromAddress(mailFrom: string): string | null {
  const wrapped = mailFrom.match(/<([^>]+)>/);
  const raw = (wrapped?.[1] ?? mailFrom).trim().toLowerCase();
  return zEmail(raw) ? raw : null;
}

function zEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
