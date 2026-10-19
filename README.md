# Reichman Entrepreneurship Club

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Resend

Newsletter issues are ordinary pages, shared on WhatsApp. Campaign email is a one-off CSV upload at `/send`. Recipients are not stored.

## Run locally

```bash
npm install
cp .env.example .env.local   # set SEND_SECRET and RESEND_API_KEY
npm run dev                  # http://localhost:3000/send
```

Until a domain is verified in Resend, keep `MAIL_FROM` on `onboarding@resend.dev`. That sender can only deliver to the inbox on the Resend account.

Plans: [`docs/01-GENERAL-PLAN.md`](docs/01-GENERAL-PLAN.md), [`docs/02-MAILING-SYSTEM-PLAN.md`](docs/02-MAILING-SYSTEM-PLAN.md).
