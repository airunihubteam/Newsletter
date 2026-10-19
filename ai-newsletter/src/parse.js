// Markdown issue → structured issue model.
// The four section headings are fixed; everything inside them is parsed
// by convention (see README → "Writing an issue").
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

export const SECTIONS = [
  { key: 'news', label: 'חדשות השבוע', match: /חדשות/ },
  { key: 'events', label: 'כנסים ואירועים', match: /כנסים|אירועים/ },
  { key: 'guide', label: 'Use Cases', match: /מדריך|use case/i },
  { key: 'concept', label: 'מושג בקטנה', match: /מושג/ },
];

const isUrl = (href) => /^https?:\/\//i.test(href || '');
// Local media committed under content/media/ (e.g. the guide video), copied to dist/media/ at build.
const isMedia = (href) => /^\/?media\/[\w./-]+\.(mp4|webm|mov)$/i.test(href || '');
const LINK_RE = /\[([^\]]+)\](?:\(([^)]*)\))?/g;
const LABEL_RE = /^\*\*([^*]+?):?\*\*:?\s*/; // **label:** rest

/** All markdown links in a string. Links without a URL are kept as placeholders. */
function extractLinks(text) {
  const out = [];
  for (const m of text.matchAll(LINK_RE)) {
    const href = (m[2] || '').trim();
    out.push({ text: m[1].trim(), href: isUrl(href) ? href : isMedia(href) ? '/' + href.replace(/^\//, '') : null });
  }
  return out;
}

/** A line made only of links separated by "·", "/" or "→". */
function isLinkLine(line) {
  const stripped = line.replace(LINK_RE, '').replace(/[·•|/→←\-\s]/g, '');
  return stripped === '' && /\[[^\]]+\]/.test(line);
}

const stripMd = (s) => s.replace(/\*\*|__|\*|_/g, '').replace(LINK_RE, '$1').trim();

function blocks(md) {
  return md
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !/^-{3,}$/.test(b));
}

// ---------- sections ----------

function parseNews(md) {
  const items = [];
  for (const block of blocks(md)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!/^\*\*/.test(lines[0])) continue;
    const item = { title: stripMd(lines[0]), summary: [], why: null, links: [] };
    for (const line of lines.slice(1)) {
      const label = line.match(LABEL_RE);
      if (label && /למה זה חשוב|why/i.test(label[1])) item.why = line.slice(label[0].length).trim();
      else if (isLinkLine(line)) item.links.push(...extractLinks(line));
      else item.summary.push(line);
    }
    item.summary = item.summary.join(' ');
    items.push(item);
  }
  return { items };
}

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/** "21.10" | "9–11.11" | "30.11–2.12" → {start, end} as ISO dates, year inferred from the issue date. */
function parseEventDate(raw, issueDate) {
  const s = raw.replace(/\s/g, '').replace(/[–—]/g, '-');
  const m = s.match(/^(\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{2,4}))?(?:-(\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{2,4}))?)?$/);
  if (!m) return null;
  let [, d1, m1, y1, d2, m2, y2] = m;
  if (!m1) m1 = m2; // "9-11.11"
  const base = new Date(issueDate);
  const pick = (d, mo, y) => {
    let year = y ? (y.length === 2 ? 2000 + +y : +y) : base.getFullYear();
    // A month well before the issue month belongs to next year (Dec issue listing Jan events).
    if (!y && +mo < base.getMonth() + 1 - 2) year += 1;
    return `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  const start = pick(d1, m1, y1);
  const end = d2 ? pick(d2, m2 || m1, y2 || y1) : start;
  return { start, end };
}

function priceOf(cell, ...context) {
  const t = [cell, ...context].join(' ');
  if (/חינם|ללא עלות|free/i.test(t)) return 'free';
  if (/בתשלום|paid|₪|\d+\s*ש"ח/i.test(t)) return 'paid';
  return null;
}

function parseEvents(md, issueDate) {
  const tokens = marked.lexer(md);
  const table = tokens.find((t) => t.type === 'table');
  const events = [];
  let notes = [];
  // Legacy format: a "לינקים:" line mapping link labels to event names.
  const legacyLinks = [];
  for (const t of tokens) {
    if (t.type !== 'paragraph') continue;
    if (/^לינקים:/.test(t.raw.trim())) legacyLinks.push(...extractLinks(t.raw));
    else notes.push(t.raw.trim());
  }
  if (table) {
    const head = table.header.map((h) => h.text.trim());
    const col = (re) => head.findIndex((h) => re.test(h));
    const c = {
      date: col(/תאריך|date/i),
      name: col(/אירוע|event|שם/i),
      where: col(/איפה|מיקום|where/i),
      who: col(/למי|what|תיאור/i),
      price: col(/מחיר|עלות|price/i),
      link: col(/הרשמה|לינק|link/i),
    };
    for (const row of table.rows) {
      const cell = (i) => (i >= 0 && row[i] ? row[i].text.trim() : '');
      const name = stripMd(cell(c.name));
      const who = cell(c.who);
      let link = extractLinks(cell(c.link)).find((l) => l.href)?.href || null;
      if (!link) {
        const hit = legacyLinks.find((l) =>
          l.text.split('/').some((part) => part.trim() && name.toLowerCase().includes(part.trim().toLowerCase())),
        );
        link = hit?.href || null;
      }
      events.push({
        dateRaw: cell(c.date),
        date: parseEventDate(cell(c.date), issueDate),
        name,
        where: stripMd(cell(c.where)),
        who: stripMd(who).replace(/\.?\s*חינם\.?$/, ''),
        price: priceOf(cell(c.price), who),
        link,
      });
    }
  }
  // Legacy links whose label isn't part of any event name ("Claude Community TLV"): give each
  // leftover link to the still-unlinked event it shares the most words with.
  const used = new Set(events.map((e) => e.link));
  const words = (s) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4));
  for (const l of legacyLinks.filter((l) => l.href && !used.has(l.href))) {
    const lw = words(l.text);
    let best = null, score = 0;
    for (const ev of events.filter((e) => !e.link)) {
      const n = [...words(`${ev.name} ${ev.where} ${ev.who}`)].filter((w) => lw.has(w)).length;
      if (n > score) { best = ev; score = n; }
    }
    if (best) best.link = l.href;
  }
  for (const ev of events) if (!ev.link) console.warn(`  ! event without registration link: ${ev.name}`);
  events.sort((a, b) => (a.date?.start || '9999').localeCompare(b.date?.start || '9999'));
  return { events, notes };
}

/** Section 3 can hold several guides: text before the first "###" is the first guide
 *  (titled by the section subtitle), every "### title" starts another one. */
function parseGuides(md, sectionSubtitle) {
  const parts = md.split(/^###\s+/m);
  const guides = [];
  if (parts[0].replace(/^\s*-{3,}\s*$/gm, '').trim()) guides.push({ title: sectionSubtitle, ...parseGuide(parts[0]) });
  for (const part of parts.slice(1)) {
    const nl = part.indexOf('\n');
    guides.push({ title: part.slice(0, nl).trim().replace(/^(מדריך|use case)\s*\d*\s*[—–:-]\s*/i, ''), ...parseGuide(part.slice(nl + 1)) });
  }
  return { guides };
}

function parseGuide(md) {
  const tokens = marked.lexer(md);
  const g = { fields: [], video: null, stepsLabel: null, steps: [], tips: [], prompts: [], teaser: null, extra: [] };
  let pendingPromptLabel = null;
  for (const t of tokens) {
    if (t.type === 'space' || t.type === 'hr') continue;
    if (t.type === 'paragraph') {
      const raw = t.raw.trim();
      // video slot: a line that mentions a video (סרטון/video) and contains a link or placeholder
      if (/סרטון|video/i.test(raw) && /\[/.test(raw) && !g.video) {
        const links = extractLinks(raw);
        g.video = {
          title: stripMd(links[0]?.text || raw).replace(/\s*→.*$/, ''),
          href: links.find((l) => l.href)?.href || null,
        };
        continue;
      }
      if (/^\*[^*].*\*$/.test(raw) || /^_[^_].*_$/.test(raw)) { g.teaser = raw.slice(1, -1); continue; }
      // a paragraph may hold several "**label:** value" lines
      for (const line of raw.split('\n')) {
        const lm = line.match(LABEL_RE);
        if (!lm) { g.extra.push(line); continue; }
        const label = lm[1].trim();
        const value = line.slice(lm[0].length).trim();
        if (/פרומפט|prompt/i.test(label)) pendingPromptLabel = label;
        else if (/טיפ|tip/i.test(label)) g.tips.push({ label, value });
        else if (!value) g.stepsLabel = label; // "**ככה זה עובד:**"
        else g.fields.push({ label, value });
      }
      continue;
    }
    if (t.type === 'list') {
      g.steps = t.items.map((it) => {
        const textTok = it.tokens.filter((x) => x.type === 'text' || x.type === 'paragraph');
        const quotes = it.tokens.filter((x) => x.type === 'blockquote').map((q) => q.text.trim());
        const text = textTok.map((x) => x.raw.trim()).join(' ');
        const lead = text.match(/^\*\*(.+?)\*\*\s*/);
        return {
          lead: lead ? lead[1].replace(/[.:]$/, '') : null,
          body: lead ? text.slice(lead[0].length) : text,
          quote: quotes.map(unquote).join('\n') || null,
        };
      });
      continue;
    }
    if (t.type === 'blockquote') {
      g.prompts.push({ label: pendingPromptLabel || 'הפרומפט להעתקה', text: unquote(t.text.trim()) });
      pendingPromptLabel = null;
    }
  }
  return g;
}

const unquote = (s) => s.replace(/^[“"](.*)[”"]$/s, '$1');

function parseConcept(md) {
  const tokens = marked.lexer(md);
  const c = { rows: [], list: null, links: [], outro: null };
  let listLabel = null;
  for (const t of tokens) {
    if (t.type === 'paragraph') {
      const raw = t.raw.trim();
      if (isLinkLine(raw)) { c.links.push(...extractLinks(raw)); continue; }
      if (/^\*[^*].*\*$/.test(raw)) { c.outro = raw.slice(1, -1); continue; }
      const lm = raw.match(LABEL_RE);
      if (lm && !raw.slice(lm[0].length).trim()) { listLabel = lm[1].trim(); continue; }
      if (lm) c.rows.push({ label: lm[1].trim(), value: raw.slice(lm[0].length).trim() });
      else c.rows.push({ label: null, value: raw });
    }
    if (t.type === 'list') {
      c.list = {
        label: listLabel,
        items: t.items.map((it) => {
          const m = it.text.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.*)$/s);
          return m ? { term: m[1], text: m[2] } : { term: null, text: it.text };
        }),
      };
    }
  }
  return c;
}

// ---------- issue ----------

export function parseIssue(file) {
  const src = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(src);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date || path.basename(file, '.md'));
  const issue = {
    number: Number(data.issue),
    date,
    title: data.title,
    description: data.description || '',
    slug: data.slug || `issue-${data.issue}`,
    ogHeadlines: Array.isArray(data.og_headlines) ? data.og_headlines : null, // optional override for the preview card
    file: path.basename(file),
    sections: {},
    outro: null,
  };
  if (!issue.number || !issue.title) throw new Error(`${file}: frontmatter needs "issue" and "title"`);

  // Split on level-2 headings.
  const parts = content.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const heading = part.slice(0, nl).trim();
    const body = part.slice(nl + 1);
    const def = SECTIONS.find((s) => s.match.test(heading));
    if (!def) { console.warn(`  ! ${issue.file}: unknown section "${heading}" — skipped`); continue; }
    // "1. המדריך — Gemini מתכנן..." → subtitle after the dash
    const clean = heading.replace(/^\d+\.\s*/, '');
    const [, subtitle = ''] = clean.split(/\s+[—–]\s+/);
    const parsed =
      def.key === 'news' ? parseNews(body)
      : def.key === 'events' ? parseEvents(body, date)
      : def.key === 'guide' ? parseGuides(body, subtitle.trim())
      : parseConcept(body);
    issue.sections[def.key] = { key: def.key, label: def.label, subtitle: subtitle.trim(), ...parsed };
  }
  for (const s of SECTIONS) {
    if (!issue.sections[s.key]) throw new Error(`${issue.file}: missing section "${s.label}"`);
  }
  // The closing italic line lives after the last section.
  issue.outro = issue.sections.concept.outro;
  delete issue.sections.concept.outro;

  // Table rows are scanned, not read — leave them out of the reading-time estimate.
  const prose = content.split('\n').filter((l) => !l.trim().startsWith('|')).join('\n');
  const words = stripMd(prose).split(/\s+/).length;
  issue.readMinutes = Number(data.read_minutes) || Math.max(2, Math.round(words / 200));
  return issue;
}

export const helpers = { isUrl, isMedia, extractLinks, stripMd, HE_MONTHS };
