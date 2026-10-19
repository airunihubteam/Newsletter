"use server";

import { sendCsvCampaign, type SendCsvResult } from "@/lib/mailing/send-csv";

export type SendFormState = SendCsvResult | null;

export async function sendCampaignAction(
  _previous: SendFormState,
  formData: FormData,
): Promise<SendFormState> {
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      message: "Choose a CSV file.",
      sent: 0,
      failed: 0,
      invalid: [],
      duplicateCount: 0,
      truncated: false,
    };
  }
  if (file.size > 1_000_000) {
    return {
      ok: false,
      message: "CSV must be 1MB or smaller.",
      sent: 0,
      failed: 0,
      invalid: [],
      duplicateCount: 0,
      truncated: false,
    };
  }

  const csvText = await file.text();
  return sendCsvCampaign({
    secret: String(formData.get("secret") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    html: String(formData.get("html") ?? ""),
    csvText,
  });
}
