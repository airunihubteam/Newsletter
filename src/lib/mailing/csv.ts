import { z } from "zod";

const emailSchema = z.email();

export const MAX_RECIPIENTS = 500;
export const MAX_CSV_CHARS = 1_000_000;

export interface CsvRecipient {
  email: string;
  firstName: string | null;
}

export interface CsvParseResult {
  recipients: CsvRecipient[];
  invalid: string[];
  duplicateCount: number;
  truncated: boolean;
}

const EMAIL_HEADERS = new Set(["email", "e-mail", "mail", "email address"]);
const NAME_HEADERS = new Set(["firstname", "first_name", "first name", "name", "given name"]);

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], names: Set<string>): number {
  return headers.findIndex((header) => names.has(header.toLowerCase()));
}

function cleanName(value: string | undefined): string | null {
  if (!value) return null;
  const name = value.replace(/[\r\n\t]/g, " ").trim().slice(0, 80);
  return name.length > 0 ? name : null;
}

/**
 * Reads a CSV (or a plain list of emails) into recipients.
 * A header row is detected when one cell is "email". Otherwise column 1 is
 * the address and column 2, when present, is the first name.
 * Nothing here is stored.
 */
export function parseRecipientCsv(raw: string): CsvParseResult {
  const text = raw.replace(/^\uFEFF/, "");
  if (text.length > MAX_CSV_CHARS) {
    return { recipients: [], invalid: ["File is larger than 1MB."], duplicateCount: 0, truncated: false };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { recipients: [], invalid: [], duplicateCount: 0, truncated: false };
  }

  const rows = lines.map(splitCsvLine);
  const first = rows[0].map((cell) => cell.toLowerCase());
  const emailColumn = headerIndex(first, EMAIL_HEADERS);
  const hasHeader = emailColumn !== -1;
  const nameColumn = hasHeader ? headerIndex(first, NAME_HEADERS) : 1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const resolvedEmailColumn = hasHeader ? emailColumn : 0;

  const recipients: CsvRecipient[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let truncated = false;

  for (const row of dataRows) {
    const rawEmail = row[resolvedEmailColumn] ?? "";
    const email = rawEmail.trim().toLowerCase();
    if (!email) continue;

    if (!emailSchema.safeParse(email).success) {
      if (invalid.length < 20) invalid.push(rawEmail.trim().slice(0, 120));
      continue;
    }
    if (seen.has(email)) {
      duplicateCount++;
      continue;
    }
    if (recipients.length >= MAX_RECIPIENTS) {
      truncated = true;
      break;
    }
    seen.add(email);
    recipients.push({
      email,
      firstName: nameColumn >= 0 ? cleanName(row[nameColumn]) : null,
    });
  }

  return { recipients, invalid, duplicateCount, truncated };
}
