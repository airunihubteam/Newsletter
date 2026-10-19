import "server-only";
import { Resend } from "resend";
import { mailingEnv } from "@/lib/env";
import { parseRecipientCsv, type CsvParseResult } from "@/lib/mailing/csv";
import { applyTokens, fromAddress, renderEmail } from "@/lib/mailing/render";

const CHUNK_SIZE = 100;

export interface SendCsvResult {
  ok: boolean;
  message: string;
  sent: number;
  failed: number;
  invalid: string[];
  duplicateCount: number;
  truncated: boolean;
}

function failure(message: string, parsed?: CsvParseResult): SendCsvResult {
  return {
    ok: false,
    message,
    sent: 0,
    failed: 0,
    invalid: parsed?.invalid ?? [],
    duplicateCount: parsed?.duplicateCount ?? 0,
    truncated: parsed?.truncated ?? false,
  };
}

/**
 * Sends one campaign from an uploaded CSV. Recipients are held in memory for
 * this request only and are not written anywhere.
 */
export async function sendCsvCampaign(input: {
  subject: string;
  html: string;
  csvText: string;
}): Promise<SendCsvResult> {
  let config: ReturnType<typeof mailingEnv>;
  try {
    config = mailingEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mailing is not configured.";
    return failure(message);
  }

  const subject = input.subject.trim();
  const html = input.html.trim();
  if (!subject || subject.length > 200) {
    return failure("Subject is required and must be 200 characters or fewer.");
  }
  if (!html || html.length > 100_000) {
    return failure("HTML body is required and must be 100,000 characters or fewer.");
  }

  const replyTo = fromAddress(config.mailFrom);
  if (!replyTo) {
    return failure("RESEND_EMAIL_DOMAIN is not a valid sender domain.");
  }

  const parsed = parseRecipientCsv(input.csvText);
  if (parsed.invalid.some((row) => row.startsWith("File is larger"))) {
    return failure(parsed.invalid[0], parsed);
  }
  if (parsed.recipients.length === 0) {
    return failure("No valid email addresses found in the CSV.", parsed);
  }

  const resend = new Resend(config.resendApiKey);
  let sent = 0;
  let failed = 0;
  let firstError = "";

  for (let offset = 0; offset < parsed.recipients.length; offset += CHUNK_SIZE) {
    const chunk = parsed.recipients.slice(offset, offset + CHUNK_SIZE);
    const payload = chunk.map((recipient) => ({
      from: config.mailFrom,
      to: [recipient.email],
      subject: applyTokens(subject, recipient.firstName, false),
      html: renderEmail(html, recipient.firstName),
      headers: {
        "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>`,
      },
      tags: [{ name: "type", value: "csv_campaign" }],
    }));

    const result = await resend.batch.send(payload);
    if (result.error) {
      failed += chunk.length;
      if (!firstError) firstError = result.error.message;
      continue;
    }
    sent += result.data?.length ?? 0;
  }

  if (sent === 0) {
    return {
      ...failure(firstError || "Resend rejected the send.", parsed),
      failed,
    };
  }

  const notes = [
    `Sent ${sent} ${sent === 1 ? "email" : "emails"}.`,
    failed > 0 ? `${failed} failed${firstError ? `: ${firstError}` : ""}.` : "",
    parsed.duplicateCount > 0 ? `${parsed.duplicateCount} duplicates skipped.` : "",
    parsed.truncated ? "Stopped at 500 recipients." : "",
  ].filter(Boolean);

  return {
    ok: failed === 0,
    message: notes.join(" "),
    sent,
    failed,
    invalid: parsed.invalid,
    duplicateCount: parsed.duplicateCount,
    truncated: parsed.truncated,
  };
}
