// Editorial rules (EDITORIAL.md), checked on every build and by `npm run check`.
// errors   → `npm run check` fails and CI does not deploy
// warnings → shown, but don't block
// Extend the domain lists when a new Israeli outlet or company shows up.

export const ISRAELI_OUTLETS = [
  'geektime.co.il', 'calcalist.co.il', 'calcalistech.com', 'globes.co.il', 'themarker.com', 'ynet.co.il',
  'ynetnews.com', 'walla.co.il', 'maariv.co.il', 'haaretz.co.il', 'haaretz.com', 'israelhayom.co.il',
  'mako.co.il', 'n12.co.il', 'kan.org.il', 'ice.co.il', 'bizportal.co.il', 'timesofisrael.com', 'jpost.com',
];

export const OFFICIAL_COMPANY_SITES = [
  'blog.google', 'google.com', 'deepmind.google', 'gemini.google', 'about.fb.com', 'ai.meta.com', 'meta.com',
  'anthropic.com', 'claude.com', 'openai.com', 'x.ai', 'microsoft.com', 'blogs.microsoft.com', 'apple.com',
  'nvidia.com', 'blogs.nvidia.com', 'mistral.ai', 'huggingface.co', 'github.com', 'github.blog', 'amazon.com',
  'aboutamazon.com', 'aws.amazon.com', 'deepseek.com', 'qwenlm.github.io', 'perplexity.ai', 'wix.com',
];

const EVENT_AGGREGATORS = ['events.co.il', 'aisafety.com', 'eventbrite.com', 'meetup.com', 'allevents.in', 'eventim.co.il'];
const OTHER_UNIVERSITIES = /אוניברסיטת תל אביב|אונ'? ?ת"?א|אונ' תל אביב|טכניון|האוניברסיטה העברית|בר[- ]אילן|בן[- ]גוריון|אוניברסיטת חיפה|ויצמן|Tel Aviv University|\bTAU\b|Technion|Hebrew University|Bar-Ilan|Ben-Gurion|Weizmann/i;
const NEWS_LINK_LABEL = /^(לפרטים|ראו עוד|לקריאה|להודעה|ההודעה|הכתבה|לכתבה|לבלוג|הבלוג)/;

const host = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};
const matches = (h, list) => list.some((d) => h === d || h.endsWith('.' + d));

export function checkIssue(issue) {
  const errors = [];
  const warnings = [];
  const news = issue.sections.news.items;

  if (news.length < 4 || news.length > 5) warnings.push(`news: ${news.length} items (the format is 4–5)`);
  for (const it of news) {
    const name = `news "${it.title.slice(0, 40)}"`;
    if (!it.why) errors.push(`${name}: missing "**למה זה חשוב:**" line`);
    if (!it.links.some((l) => l.href)) errors.push(`${name}: no link`);
    for (const l of it.links) {
      if (!l.href) continue;
      const h = host(l.href);
      if (!matches(h, ISRAELI_OUTLETS) && !matches(h, OFFICIAL_COMPANY_SITES)) {
        errors.push(`${name}: ${h} is neither a known Israeli outlet nor an official company site (src/link-policy.js)`);
      }
      if (!NEWS_LINK_LABEL.test(l.text)) warnings.push(`${name}: link text "${l.text}" — use "לפרטים נוספים…" / "ראו עוד…"`);
    }
  }

  for (const ev of issue.sections.events.events) {
    const name = `event "${ev.name}"`;
    if (!ev.link) errors.push(`${name}: no official / Luma link — remove the event or find one`);
    // exact domain only: listing pages live on the main domain, while e.g. <event>.events.co.il is the event's own microsite
    else if (EVENT_AGGREGATORS.includes(host(ev.link))) errors.push(`${name}: ${host(ev.link)} is a listing site — use the official page or Luma`);
    if (OTHER_UNIVERSITIES.test(`${ev.name} ${ev.where} ${ev.who}`)) {
      errors.push(`${name}: another university (${ev.where}) — the club doesn't list other universities' events`);
    }
    if (!ev.date) warnings.push(`${name}: can't read the date "${ev.dateRaw}" (use 21.10 or 9–11.11)`);
    else if (ev.date.end < issue.date) errors.push(`${name}: ${ev.dateRaw} is before the issue date`);
  }
  return { errors, warnings };
}
