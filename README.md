# Reichman Entrepreneurship Club

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Resend

Newsletter issues are ordinary pages, shared on WhatsApp. Campaign email is a one-off CSV upload at `/send`. Recipients are not stored.

## Run locally

```bash
npm install
cp .env.example .env.local   # set SEND_SECRET and RESEND_API_KEY
npm run dev                  # http://localhost:3000/send
```

Mail is sent from `newsletter@$RESEND_EMAIL_DOMAIN`. Set `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN` to the same values as Vercel.

Plans: [`docs/01-GENERAL-PLAN.md`](docs/01-GENERAL-PLAN.md), [`docs/02-MAILING-SYSTEM-PLAN.md`](docs/02-MAILING-SYSTEM-PLAN.md).
