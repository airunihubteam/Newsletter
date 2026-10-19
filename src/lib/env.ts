import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  APP_URL: z.url(),
  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  UNSUBSCRIBE_SECRET: z.string().min(32),
  ADMIN_EMAILS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Validated server env. Parsed lazily so `next build` doesn't need secrets
 * for routes that never touch them; throws with every missing key listed.
 */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${keys}`);
  }
  cached = parsed.data;
  return cached;
}

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/);

const mailingEnvSchema = z.object({
  RESEND_API_KEY: z.string().startsWith("re_"),
  RESEND_EMAIL_DOMAIN: domainSchema,
  SEND_SECRET: z.string().min(16),
});

export type MailingEnv = {
  resendApiKey: string;
  sendSecret: string;
  mailFrom: string;
};

/** Env used by CSV sending. Does not require a database. */
export function mailingEnv(): MailingEnv {
  const parsed = mailingEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${keys}`);
  }
  return {
    resendApiKey: parsed.data.RESEND_API_KEY,
    sendSecret: parsed.data.SEND_SECRET,
    mailFrom: `Reichman Entrepreneurship Club <newsletter@${parsed.data.RESEND_EMAIL_DOMAIN}>`,
  };
}
