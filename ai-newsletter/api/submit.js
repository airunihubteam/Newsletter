// Vercel Serverless Function: POST /api/submit  (copied into dist/api/ at build time)
// Validates a reader-form submission and forwards it to a Google Apps Script web app,
// which appends it as a row in the team's Google Sheet (deploy/google-apps-script.gs).
// Env (Vercel → Project → Settings → Environment Variables):
//   FORMS_WEBHOOK_URL    the Apps Script web-app URL
//   FORMS_SHARED_SECRET  same random string as SHARED_SECRET in the Apps Script
// CommonJS on purpose: dist/ has no package.json, so this file must not rely on "type": "module".

const FORMS = {
  event: ['event_name', 'event_date', 'event_time', 'location', 'link', 'price', 'audience', 'submitter_name', 'contact'],
  share: ['kind', 'title', 'details', 'link', 'submitter_name', 'contact', 'consent'],
};
const REQUIRED = { event: ['event_name', 'event_date', 'location', 'link'], share: ['kind', 'title', 'details'] };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  let data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return res.status(400).json({ ok: false, error: 'bad_json' }); }
  }
  const fields = data && FORMS[data.form];
  if (!fields) return res.status(400).json({ ok: false, error: 'unknown_form' });
  if (data.website) return res.status(200).json({ ok: true }); // honeypot filled → bot; pretend success

  const row = { form: data.form, received_at: new Date().toISOString() };
  for (const k of fields) row[k] = String(data[k] ?? '').slice(0, 4000);
  for (const k of REQUIRED[data.form]) if (!row[k]) return res.status(400).json({ ok: false, error: `missing_${k}` });
  if (row.link && !/^https?:\/\//i.test(row.link)) return res.status(400).json({ ok: false, error: 'bad_link' });

  if (!process.env.FORMS_WEBHOOK_URL) return res.status(503).json({ ok: false, error: 'not_configured' });
  const r = await fetch(process.env.FORMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.FORMS_SHARED_SECRET || '', ...row }),
    redirect: 'follow',
  });
  if (!r.ok) return res.status(502).json({ ok: false, error: 'upstream' });
  return res.status(200).json({ ok: true });
};
