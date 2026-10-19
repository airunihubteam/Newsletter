# RUEC Innovation & AI — weekly newsletter

A static site generator for the weekly newsletter of the Innovation & AI department of the Reichman University
Entrepreneurship Club (מועדון היזמות, אוניברסיטת רייכמן). Each Markdown file in `content/issues/` becomes a
mobile-first Hebrew RTL page, a WhatsApp preview image, and a printable PDF.

```
content/issues/2026-10-20.md  ──►  dist/issue-1/index.html            the issue
                                   dist/issue-1/og.jpg                 WhatsApp / social preview card (1200×630)
                                   dist/issue-1/ruec-ai-newsletter-01.pdf
                                   dist/index.html                     archive of all issues
                                   dist/latest/  +  dist/vercel.json   /latest → newest issue
```

No framework: Node (`marked`, `gray-matter`), Chrome via `playwright-core` for the OG card, Python
(`reportlab` + `python-bidi`) for the PDF. An issue page is one HTML file (~15 KB gzipped, CSS and JS inlined) plus the Noto Sans Hebrew web font.

## Quick start

```bash
npm install
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # PDF export
cp .env.example .env                                                  # then fill in the values
npm run dev          # fast build (no OG/PDF) + local server on http://localhost:4321
npm run build        # full build: pages + OG images + PDFs
```

Requires Node 20+, Python 3.9+, and Google Chrome installed (or set `CHROME_PATH`).

| `.env` | |
|---|---|
| `POSTHOG_KEY` | PostHog project API key (`phc_…`). Without it, events are logged to the browser console. |
| `POSTHOG_HOST` | `https://eu.i.posthog.com` (EU cloud) |
| `SITE_URL` | Public URL, no trailing slash. Used for `og:image` and canonical links — WhatsApp needs absolute URLs. |

## Every week

```bash
npm run new      # creates content/issues/<last date + 7>.md from content/TEMPLATE.md, with the next issue number
npm run check    # editorial rules from EDITORIAL.md — must pass (CI runs it and won't deploy on errors)
npm run dev      # preview
git push         # deploys (or `npm run deploy` to publish straight from this Mac)
```

The editorial rules (sources, events, structure) are in **[EDITORIAL.md](EDITORIAL.md)**. `npm run check` enforces them:
- news links only to Israeli outlets or official company sites, with "לפרטים נוספים…" link text
- event links only to official sites or Luma
- no events of other universities, and no past events
- 4–5 news items, each with a "למה זה חשוב" line

## Writing an issue

Create `content/issues/YYYY-MM-DD.md` (or use `npm run new`). Frontmatter:

```yaml
---
issue: 2
date: 2026-10-24
title: הכותרת הגדולה של הגיליון
description: "שורה אחת שמופיעה מתחת לכותרת ובתצוגה המקדימה בוואטסאפ."
# optional:
slug: issue-2              # default: issue-<number>
read_minutes: 4            # default: estimated
og_headlines: [ "…", "…", "…" ]   # default: the first 3 news headlines, shortened
---
```

The body needs the four fixed `##` sections. They are matched by keyword, so `## 1. חדשות השבוע` and
`## חדשות השבוע — מה קרה` both work, and the text after ` — ` becomes the section subtitle.

**חדשות השבוע** — one block per item, separated by a blank line:

```md
**הכותרת**
שורה או שתיים של תקציר.
**למה זה חשוב:** משפט אחד.
[מקור](https://…) · [מקור נוסף](https://…)
```

**כנסים ואירועים** — a table. Columns are found by header name; `מחיר` and `הרשמה` are optional.
Rows are sorted by date automatically. `9–11.11` ranges work; the year is taken from the issue date.

```md
| תאריך | אירוע | איפה | למי זה | מחיר | הרשמה |
|---|---|---|---|---|---|
| 21.10 | שם האירוע | מקום, שעה | תיאור קצר | חינם | [הרשמה](https://…) |
```

- `מחיר`: `חינם` → "Free" tag, `בתשלום` → "Paid" tag, empty → no tag. With no `מחיר` column, the word "חינם" in the description is detected.
- Without a `הרשמה` column, the older style still works: a `לינקים: [Name](url) · …` line under the table. Each link is matched to the event whose name contains its label (labels can be split with `/`). Leftover links go to the unlinked event they share the most words with, and the build warns about any event still missing a link.

**Use Cases** (section 3) — `**הבעיה:**` / `**הכלי:**` label lines, one video line, a numbered list of steps (a `>` quote inside a step
gets its own copy button), `**טיפ:**`, then `**הפרומפט שלכם להעתקה:**` followed by a `>` quote, and an optional
italic `*בגיליון הבא: …*` teaser.

Video line: `[סרטון בוטי — "כותרת" · 1:20 דקות](media/file.mp4)` for a file in `content/media/`, or a YouTube link.
For a file, run `npm run poster` once (`POSTER_AT=8 npm run poster -- --force` picks the frame at 8s). That writes the
opening frame next to the video, and the frame's size tells the page if the video is vertical. Nothing is downloaded until
someone taps play. Keep videos under ~50 MB. YouTube links become a click-to-load embed. With no URL,
an empty "coming soon" slot appears.

Several guides in one issue: start each extra guide with a `### title` line inside section 3. Each one gets its own header
("Use case 2") and the same components.

**מושג בקטנה** — `**מה זה:**` paragraph, a `**…:**` label followed by a bullet list of `**Term** — text`, more label
paragraphs, and a links line. The final italic line of the file becomes the closing line above the CTA.

Links without a URL (`[לינק]`, `[טקסט](לבחור ביוטיוב)`) are rendered as muted placeholders instead of broken links.

### Bootie

Drop the mascot at `assets/bootie.webp` (or `.png` / `.svg`) and rebuild. It replaces `assets/bootie-placeholder.svg`
next to The Guide and Concept in brief, in the empty video slot, and on the OG card. A square image with a
transparent background works best, at least 256×256.

## Forms

`/submit-event/` and `/share/` are the reader forms. The CTA buttons and the "מכירים אירוע שלא פה?" line link to them.
They post to `/api/submit`. In production that is `api/submit.js`, a Vercel function deployed with the site. It validates the submission, drops bots (honeypot field), and forwards it to a Google Sheet:

1. Create a Google Sheet → Extensions → Apps Script → paste `deploy/google-apps-script.gs` → set `SHARED_SECRET`.
2. Deploy → New deployment → Web app, execute as *Me*, access *Anyone* → copy the URL.
3. Vercel → the project → Settings → Environment Variables: add `FORMS_WEBHOOK_URL` (the URL) and
   `FORMS_SHARED_SECRET` (same string), then redeploy.

Each form fills its own tab (`Events`, `Ideas`) in the team sheet
"RUEC AI Newsletter – Form submissions" (Apps Script project "Newsletter forms webhook", already deployed and
connected in Vercel). After editing the script: Deploy → Manage deployments → ✎ → Version: New version → Deploy
(the URL stays the same). Locally, `npm run dev` writes submissions to `.cache/submissions.jsonl`.
PostHog only gets `form_view` / `form_submit` with the form name, never the answers.

## Deploy (Vercel via GitHub Actions)

The build needs Chrome and Python, which Vercel's build servers don't have. So `.github/workflows/deploy.yml` builds on
GitHub's runner (Chrome is preinstalled) and uploads the finished `dist/` with the Vercel CLI: static files,
`dist/vercel.json` (redirects and headers) and `dist/api/submit.js` (the forms function).
Pushes to `main` go to production. Pull requests get a preview URL.

One-time setup:
1. `npx vercel login`, then `npx vercel link --yes --project ruec-ai-newsletter`. This creates the project and writes
   `.vercel/project.json` with `orgId` and `projectId`. Don't import the repo in Vercel's dashboard, or every push deploys twice.
2. vercel.com → Account Settings → Tokens → create a token.
3. GitHub → repo → Settings → Secrets and variables → Actions:
   - secrets: `VERCEL_TOKEN`, `POSTHOG_KEY`
   - variables: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (from `.vercel/project.json`), `SITE_URL` (e.g. `https://ruec-ai-newsletter.vercel.app`)
4. Push. Every new `content/issues/*.md` you commit is live a minute later.

`/latest` is a real HTTP redirect to the newest issue (`dist/vercel.json`), so a pinned `…/latest` link in the WhatsApp
community always shows the current issue's preview card. Before posting, paste the link into
https://www.opengraph.xyz to check the card. WhatsApp caches previews per URL, so add `?utm_…` parameters to get a fresh one.

Vercel's free Hobby plan is meant for non-commercial projects, which a student club newsletter is.

## Analytics (PostHog)

PostHog EU cloud with `persistence: "memory"`: no cookies and no localStorage, so no consent banner is needed.
Autocapture, pageviews and session recording are off, so only the events below are sent. The key is injected at build time
from `POSTHOG_KEY` and never lives in the repo.

Every event carries `issue_number`, `issue_slug` and any `utm_*` parameters.

| Event | When | Properties |
|---|---|---|
| `issue_view` | issue page loads | `issue_number`, `utm_source/medium/campaign/content`, `referrer`, `in_app_browser` |
| `section_view` | a section covers ≥50% of the viewport (or ≥50% of itself if shorter), once per section | `section` (`news`/`events`/`guide`/`concept`/`closing`), `section_index`, `seconds_since_load` |
| `section_time` | a section stops holding the middle of the screen, or the tab is hidden | `section`, `section_index`, `seconds` |
| `link_click` | any outbound link | `section`, `item` (headline / event name), `url`, `link_text`, `domain` |
| `cta_click` | form button, PDF download, WhatsApp share | `cta`, `location`, `url` |
| `prompt_copy` | copy button | `section`, `item`, `length` |
| `video_play` | video slot started | `item`, `provider`, `video_id` |
| `scroll_depth` | 25 / 50 / 75 / 100 % of the page, once each | `depth`, `seconds_since_load` |

`data-section` / `data-item` are stamped on every outbound link at build time (`src/render.js`). Anything that slips
through gets `data-section="other"`, and the build prints a warning.

**Share links with UTMs** so you can see which post brought readers:
`https://…/issue-2/?utm_source=whatsapp&utm_medium=community&utm_campaign=issue-2`

> Cookieless trade-off: each page load gets a fresh anonymous ID, so "unique users" means unique *visits*.
> If you later want daily-unique counts without cookies, enable PostHog's cookieless server-hash mode
> (Project settings → Web analytics) and add `cookieless_mode: 'always'` in `src/client/analytics.js`.

### Building a per-issue dashboard

Make the first dashboard once, then duplicate it each week and change one filter.

1. **Dashboards → New dashboard** → name it `גיליון #N`. In the dashboard's **Filters**, add the property filter
   `issue_number = N` and save. Every insight on the dashboard inherits it.
2. **Views** → New insight → *Trends* → event `issue_view`, total count, display *Number*. Add a second series,
   or a breakdown by `utm_source`, to see where readers came from. For a daily curve, use display *Line* with interval *Day*.
3. **How many reached the end** → *Funnels* → steps `issue_view` → `section_view` where `section = concept` →
   `scroll_depth` where `depth = 100`. Conversion window: 1 hour. The last step's % is your completion rate.
   For a drop-off view across the whole issue, use the steps `section_view` with `section` = news → events → guide → concept → closing.
4. **Most-clicked items** → *Trends* → event `link_click`, breakdown by `item`, display *Table* (or *Bar chart*),
   date range covering the issue. Add a second breakdown by `section` to compare sections. The same pattern works for
   `cta_click` broken down by `cta`.
5. **Time per section** → *Trends* → event `section_time`, aggregation *Property value → median* of `seconds`,
   breakdown by `section`, display *Bar chart*. Add a second series with *sum* of `seconds` to see total attention.
   Or as SQL (*SQL insight*):

   ```sql
   SELECT properties.section AS section,
          count() AS visits,
          round(median(toFloat(properties.seconds)), 1) AS median_seconds,
          round(sum(toFloat(properties.seconds)) / 60, 1) AS total_minutes
   FROM events
   WHERE event = 'section_time' AND properties.issue_number = 1
   GROUP BY section
   ORDER BY total_minutes DESC
   ```
6. Optional tiles: `prompt_copy` count (did the guide land?), `video_play` count, and `scroll_depth` broken down by `depth`
   as a bar chart (a cheap scroll funnel).

Next week: **⋯ → Duplicate dashboard**, rename it, and change the filter to the new `issue_number`.

## Project layout

```
content/issues/      one Markdown file per issue
src/parse.js         Markdown → issue model (the 4 fixed sections)
src/render.js        model → HTML components; link tracking attributes; bidi guards
src/styles.css       design tokens from design-tokens.md (extracted from ruec.co.il)
src/client/          ui.js (copy, video, progress), analytics.js (PostHog)
scripts/build.js     the pipeline
scripts/og.js        OG card via headless Chrome
scripts/pdf.py       PDF via reportlab + python-bidi (RTL, mixed Hebrew/English)
scripts/fonts.py     rebuilds the merged Hebrew+Latin PDF font in assets/fonts/
assets/              logo, Bootie, fonts
api/submit.js        forms endpoint (Vercel function) → Google Sheet via deploy/google-apps-script.gs
```
