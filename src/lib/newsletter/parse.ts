// Markdown issue → structured issue model.
// Port of archive/ai-newsletter/src/parse.js. The four section headings are fixed.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { lexer, type Token, type Tokens } from "marked";
import type {
  ConceptSection,
  ContentLink,
  EventItem,
  Guide,
  Issue,
  IssueVideo,
  NewsItem,
} from "@/lib/newsletter/types";

const SECTIONS = [
  { key: "news", label: "חדשות השבוע", match: /חדשות/ },
  { key: "events", label: "כנסים ואירועים", match: /כנסים|אירועים/ },
  { key: "guide", label: "Use Cases", match: /מדריך|use case/i },
  { key: "concept", label: "מושג בקטנה", match: /מושג/ },
] as const;

const linkPattern = () => /\[([^\]]+)\](?:\(([^)]*)\))?/g;
const LABEL_RE = /^\*\*([^*]+?):?\*\*:?\s*/;

const isUrl = (href: string) => /^https?:\/\//i.test(href);
const isMedia = (href: string) =>
  /^\/?media\/[\w./-]+\.(mp4|webm|mov)$/i.test(href) && !href.includes("..");

function publicHref(href: string): string | null {
  const clean = href.trim();
  if (isUrl(clean)) return clean;
  if (!isMedia(clean)) return null;
  return `/newsletter/${clean.replace(/^\//, "")}`;
}

function extractLinks(text: string): ContentLink[] {
  const out: ContentLink[] = [];
  for (const match of text.matchAll(linkPattern())) {
    const href = (match[2] || "").trim();
    out.push({ text: match[1].trim(), href: href ? publicHref(href) : null });
  }
  return out;
}

function isLinkLine(line: string): boolean {
  const stripped = line.replace(linkPattern(), "").replace(/[·•|/→←\-\s]/g, "");
  return stripped === "" && /\[[^\]]+\]/.test(line);
}

const stripMd = (value: string) =>
  value
    .replace(/\*\*|__|\*|_/g, "")
    .replace(linkPattern(), "$1")
    .trim();

function blocks(md: string): string[] {
  return md
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^-{3,}$/.test(block));
}

function parseNews(md: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const block of blocks(md)) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const titleLine = lines[0];
    if (!titleLine || !/^\*\*/.test(titleLine)) continue;
    const item: NewsItem = { title: stripMd(titleLine), summary: "", why: null, links: [] };
    const summary: string[] = [];
    for (const line of lines.slice(1)) {
      const label = line.match(LABEL_RE);
      if (label && /למה זה חשוב|why/i.test(label[1])) item.why = line.slice(label[0].length).trim();
      else if (isLinkLine(line)) item.links.push(...extractLinks(line));
      else summary.push(line);
    }
    item.summary = summary.join(" ");
    items.push(item);
  }
  return items;
}

function parseEventDate(raw: string, issueDate: string): { start: string; end: string } | null {
  const s = raw.replace(/\s/g, "").replace(/[–—]/g, "-");
  const match = s.match(
    /^(\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{2,4}))?(?:-(\d{1,2})(?:\.(\d{1,2}))?(?:\.(\d{2,4}))?)?$/,
  );
  if (!match) return null;
  let [, d1, m1, y1, d2, m2, y2] = match;
  if (!m1) m1 = m2;
  if (!m1 || !d1) return null;
  const base = new Date(`${issueDate}T12:00:00`);
  const pick = (day: string, month: string, year: string | undefined) => {
    let fullYear = year ? (year.length === 2 ? 2000 + Number(year) : Number(year)) : base.getFullYear();
    if (!year && Number(month) < base.getMonth() + 1 - 2) fullYear += 1;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };
  const start = pick(d1, m1, y1);
  const end = d2 ? pick(d2, m2 || m1, y2 || y1) : start;
  return { start, end };
}

function priceOf(cell: string, ...context: string[]): "free" | "paid" | null {
  const text = [cell, ...context].join(" ");
  if (/חינם|ללא עלות|free/i.test(text)) return "free";
  if (/בתשלום|paid|₪|\d+\s*ש"ח/i.test(text)) return "paid";
  return null;
}

function isTable(token: Token): token is Tokens.Table {
  return token.type === "table";
}

function isParagraph(token: Token): token is Tokens.Paragraph {
  return token.type === "paragraph";
}

function parseEvents(md: string, issueDate: string): { events: EventItem[]; notes: string[] } {
  const tokens = lexer(md);
  const table = tokens.find(isTable);
  const events: EventItem[] = [];
  const notes: string[] = [];
  const legacyLinks: ContentLink[] = [];
  for (const token of tokens) {
    if (!isParagraph(token)) continue;
    if (/^לינקים:/.test(token.raw.trim())) legacyLinks.push(...extractLinks(token.raw));
    else notes.push(token.raw.trim());
  }
  if (table) {
    const head = table.header.map((cell) => cell.text.trim());
    const col = (re: RegExp) => head.findIndex((header) => re.test(header));
    const columns = {
      date: col(/תאריך|date/i),
      name: col(/אירוע|event|שם/i),
      where: col(/איפה|מיקום|where/i),
      who: col(/למי|what|תיאור/i),
      price: col(/מחיר|עלות|price/i),
      link: col(/הרשמה|לינק|link/i),
    };
    for (const row of table.rows) {
      const cell = (index: number) => (index >= 0 && row[index] ? row[index].text.trim() : "");
      const name = stripMd(cell(columns.name));
      const who = cell(columns.who);
      let link = extractLinks(cell(columns.link)).find((item) => item.href)?.href ?? null;
      if (!link) {
        const hit = legacyLinks.find((item) =>
          item.text.split("/").some((part) => part.trim() && name.toLowerCase().includes(part.trim().toLowerCase())),
        );
        link = hit?.href ?? null;
      }
      events.push({
        dateRaw: cell(columns.date),
        date: parseEventDate(cell(columns.date), issueDate),
        name,
        where: stripMd(cell(columns.where)),
        who: stripMd(who).replace(/\.?\s*חינם\.?$/, ""),
        price: priceOf(cell(columns.price), who),
        link,
      });
    }
  }
  const used = new Set(events.map((event) => event.link));
  const words = (value: string) =>
    new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 4));
  for (const item of legacyLinks.filter((link) => link.href && !used.has(link.href))) {
    const linkWords = words(item.text);
    let best: EventItem | null = null;
    let score = 0;
    for (const event of events.filter((candidate) => !candidate.link)) {
      const shared = [...words(`${event.name} ${event.where} ${event.who}`)].filter((word) => linkWords.has(word)).length;
      if (shared > score) {
        best = event;
        score = shared;
      }
    }
    if (best && item.href) best.link = item.href;
  }
  events.sort((a, b) => (a.date?.start || "9999").localeCompare(b.date?.start || "9999"));
  return { events, notes };
}

function emptyVideo(title: string, href: string | null): IssueVideo {
  return { title, href, poster: null, width: null, height: null, vertical: false };
}

function parseGuide(md: string): Omit<Guide, "title"> {
  const tokens = lexer(md);
  const guide: Omit<Guide, "title"> = {
    fields: [],
    video: null,
    stepsLabel: null,
    steps: [],
    tips: [],
    prompts: [],
    teaser: null,
    extra: [],
  };
  let pendingPromptLabel: string | null = null;
  for (const token of tokens) {
    if (token.type === "space" || token.type === "hr") continue;
    if (isParagraph(token)) {
      const raw = token.raw.trim();
      if (/סרטון|video/i.test(raw) && /\[/.test(raw) && !guide.video) {
        const links = extractLinks(raw);
        guide.video = emptyVideo(
          stripMd(links[0]?.text || raw).replace(/\s*→.*$/, ""),
          links.find((link) => link.href)?.href ?? null,
        );
        continue;
      }
      if (/^\*[^*].*\*$/.test(raw) || /^_[^_].*_$/.test(raw)) {
        guide.teaser = raw.slice(1, -1);
        continue;
      }
      for (const line of raw.split("\n")) {
        const labelMatch = line.match(LABEL_RE);
        if (!labelMatch) {
          guide.extra.push(line);
          continue;
        }
        const label = labelMatch[1].trim();
        const value = line.slice(labelMatch[0].length).trim();
        if (/פרומפט|prompt/i.test(label)) pendingPromptLabel = label;
        else if (/טיפ|tip/i.test(label)) guide.tips.push({ label, value });
        else if (!value) guide.stepsLabel = label;
        else guide.fields.push({ label, value });
      }
      continue;
    }
    if (token.type === "list") {
      const list = token as Tokens.List;
      guide.steps = list.items.map((item) => {
        const textTokens = item.tokens.filter((part) => part.type === "text" || part.type === "paragraph");
        const quotes = item.tokens
          .filter((part): part is Tokens.Blockquote => part.type === "blockquote")
          .map((quote) => unquote(quote.text.trim()));
        const text = textTokens.map((part) => part.raw.trim()).join(" ");
        const lead = text.match(/^\*\*(.+?)\*\*\s*/);
        return {
          lead: lead ? lead[1].replace(/[.:]$/, "") : null,
          body: lead ? text.slice(lead[0].length) : text,
          quote: quotes.join("\n") || null,
        };
      });
      continue;
    }
    if (token.type === "blockquote") {
      const quote = token as Tokens.Blockquote;
      guide.prompts.push({
        label: pendingPromptLabel || "הפרומפט להעתקה",
        text: unquote(quote.text.trim()),
      });
      pendingPromptLabel = null;
    }
  }
  return guide;
}

const unquote = (value: string) => value.replace(/^[“"]([\s\S]*)[”"]$/, "$1");

function parseGuides(md: string, sectionSubtitle: string): Guide[] {
  const parts = md.split(/^###\s+/m);
  const guides: Guide[] = [];
  if (parts[0].replace(/^\s*-{3,}\s*$/gm, "").trim()) {
    guides.push({ title: sectionSubtitle, ...parseGuide(parts[0]) });
  }
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    const title = part
      .slice(0, nl)
      .trim()
      .replace(/^(מדריך|use case)\s*\d*\s*[—–:-]\s*/i, "");
    guides.push({ title, ...parseGuide(part.slice(nl + 1)) });
  }
  return guides;
}

function parseConcept(md: string): ConceptSection {
  const tokens = lexer(md);
  const concept: ConceptSection = { rows: [], list: null, links: [] };
  let listLabel: string | null = null;
  for (const token of tokens) {
    if (isParagraph(token)) {
      const raw = token.raw.trim();
      if (isLinkLine(raw)) {
        concept.links.push(...extractLinks(raw));
        continue;
      }
      if (/^\*[^*].*\*$/.test(raw)) continue;
      const labelMatch = raw.match(LABEL_RE);
      if (labelMatch && !raw.slice(labelMatch[0].length).trim()) {
        listLabel = labelMatch[1].trim();
        continue;
      }
      if (labelMatch) concept.rows.push({ label: labelMatch[1].trim(), value: raw.slice(labelMatch[0].length).trim() });
      else concept.rows.push({ label: null, value: raw });
    }
    if (token.type === "list") {
      const list = token as Tokens.List;
      concept.list = {
        label: listLabel,
        items: list.items.map((item) => {
          const match = item.text.match(/^\*\*(.+?)\*\*\s*[—–:-]\s*([\s\S]*)$/);
          return match ? { term: match[1], text: match[2] } : { term: null, text: item.text };
        }),
      };
    }
  }
  return concept;
}

function isoDate(value: unknown, file: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 10);
  return path.basename(file, ".md");
}

export function parseIssue(file: string): Issue {
  const source = fs.readFileSync(file, "utf8");
  const { data, content } = matter(source);
  const date = isoDate(data.date, file);
  const number = Number(data.issue);
  const title = typeof data.title === "string" ? data.title : "";
  if (!number || !title) throw new Error(`${file}: frontmatter needs "issue" and "title"`);

  const issue: Issue = {
    number,
    date,
    title,
    description: typeof data.description === "string" ? data.description : "",
    slug: typeof data.slug === "string" && data.slug ? data.slug : `issue-${data.issue}`,
    file: path.basename(file),
    readMinutes: 2,
    outro: null,
    sections: {
      news: { key: "news", label: "חדשות השבוע", subtitle: "", items: [] },
      events: { key: "events", label: "כנסים ואירועים", subtitle: "", events: [], notes: [] },
      guide: { key: "guide", label: "Use Cases", subtitle: "", guides: [] },
      concept: { key: "concept", label: "מושג בקטנה", subtitle: "", rows: [], list: null, links: [] },
    },
  };

  const parts = content.split(/^##\s+/m).slice(1);
  const seen = new Set<string>();
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const heading = part.slice(0, nl).trim();
    const body = part.slice(nl + 1);
    const def = SECTIONS.find((section) => section.match.test(heading));
    if (!def) {
      console.warn(`  ! ${issue.file}: unknown section "${heading}" — skipped`);
      continue;
    }
    const clean = heading.replace(/^\d+\.\s*/, "");
    const subtitle = (clean.split(/\s*[—–:]\s+/)[1] ?? "").trim();
    seen.add(def.key);
    if (def.key === "news") {
      issue.sections.news = { key: def.key, label: def.label, subtitle, items: parseNews(body) };
    } else if (def.key === "events") {
      const parsed = parseEvents(body, date);
      issue.sections.events = { key: def.key, label: def.label, subtitle, ...parsed };
    } else if (def.key === "guide") {
      issue.sections.guide = { key: def.key, label: def.label, subtitle, guides: parseGuides(body, subtitle) };
    } else {
      issue.sections.concept = { key: def.key, label: def.label, subtitle, ...parseConcept(body) };
    }
  }

  for (const section of SECTIONS) {
    if (!seen.has(section.key)) throw new Error(`${issue.file}: missing section "${section.label}"`);
  }

  const outroToken = [...lexer(content)].reverse().find((token) => {
    if (!isParagraph(token)) return false;
    const raw = token.raw.trim();
    return /^\*[^*].*\*$/.test(raw) || /^_[^_].*_$/.test(raw);
  });
  issue.outro = outroToken && isParagraph(outroToken) ? outroToken.raw.trim().slice(1, -1) : null;

  const prose = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("|"))
    .join("\n");
  const words = stripMd(prose).split(/\s+/).length;
  const specified = Number(data.read_minutes);
  issue.readMinutes = specified || Math.max(2, Math.round(words / 200));
  return issue;
}
