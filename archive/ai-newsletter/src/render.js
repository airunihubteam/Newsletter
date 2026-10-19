// Issue model → HTML. Every outbound <a> is produced by `link()` or the inline
// markdown renderer, both of which stamp data-section / data-item, and a final
// pass (`tagLinks`) catches anything that slipped through.
import fs from 'node:fs';
import { Marked } from 'marked';
import { helpers } from './parse.js';

const { isUrl, HE_MONTHS } = helpers;
const HE_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const HE_MONTHS_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- tracking context for links ----
let ctx = { section: 'other', item: '' };
const withCtx = (section, item, fn) => {
  const prev = ctx;
  ctx = { section, item };
  try { return fn(); } finally { ctx = prev; }
};
const trackAttrs = (extra = {}) => {
  const a = { 'data-section': ctx.section, 'data-item': ctx.item.slice(0, 120), ...extra };
  return Object.entries(a).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
};

export function link(href, html, { cls = '', item, attrs = {} } = {}) {
  if (!isUrl(href)) return `<span class="placeholder-link ${cls}" title="קישור יתווסף בקרוב">${html}</span>`;
  const extra = item ? { 'data-item': item } : {};
  return `<a href="${esc(href)}" class="${cls}" target="_blank" rel="noopener" ${trackAttrs({ ...attrs, ...extra })}>${html}</a>`;
}

const md = new Marked({
  renderer: {
    link({ href, tokens }) {
      return link(href, this.parser.parseInline(tokens));
    },
  },
});
// Bidi guards for RTL text, applied to already-escaped HTML text:
//  - numeric ranges/times ("9–11", "18:00–21:00") would render reversed ("11–9") in RTL → isolate as LTR
//  - quoted Latin terms ("open-weights") break at the hyphen and lose their quotes → isolate + no-wrap
export const bidi = (html) =>
  html
    .split(/(<[^>]+>)/)
    .map((part) =>
      part.startsWith('<')
        ? part // never touch tags/attributes (URLs contain dates like 2026-10-12)
        : part
            .replace(/(?<![\w.:])(\d[\d.:,]*\s?[–—-]\s?\d[\d.:,]*)(?!\w)/g, '<span dir="ltr">$1</span>')
            .replace(/&quot;([A-Za-z][A-Za-z0-9 .\-]{1,40})&quot;/g, '<span class="nw" dir="ltr">&quot;$1&quot;</span>')
            // comma lists of Latin names ("Gemini 4 Argon, Muse Wonder") form one LTR run, so the
            // first item lands on the left → isolate each item so the list reads right-to-left
            .replace(/(?<![A-Za-z0-9&.\-] ?)[A-Za-z][A-Za-z0-9.\- ]*[A-Za-z0-9](?:, [A-Za-z][A-Za-z0-9.\- ]*[A-Za-z0-9])+(?! ?[&A-Za-z0-9])/g, (m) =>
              m.split(', ').map((x) => `<bdi>${x}</bdi>`).join(', ')),
    )
    .join('');
const t = (s) => bidi(esc(s));

// Bare "[text]" placeholders are left as literal text by marked; render them as muted chips.
const inline = (s = '') =>
  bidi(md.parseInline(s)).replace(/\[([^\]<]+)\](?!\()/g, '<span class="placeholder-link">$1</span>');

// ---- small pieces ----

function heDate(iso, { weekday = false } = {}) {
  const d = new Date(iso + 'T12:00:00');
  const s = `${d.getDate()} ב${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return weekday ? `יום ${HE_DAYS[d.getDay()]}, ${s}` : s;
}
const dotDate = (iso) => iso.split('-').reverse().join('.');

const ICONS = {
  news: '<path d="M4 6h16M4 11h16M4 16h10" />',
  events: '<rect x="4" y="5" width="16" height="15" /><path d="M4 10h16M9 3v4M15 3v4" />',
  guide: '<path d="M5 5h4v4H5zM5 15h4v4H5zM13 7h6M13 17h6" />',
  concept: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z" />',
};
const icon = (k) =>
  `<svg class="opener-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">${ICONS[k]}</svg>`;

function opener(section, n, { bootie, bubble } = {}) {
  return `
  <header class="opener">
    <div class="opener-num" aria-hidden="true">0${n}</div>
    <div class="opener-text">
      <p class="kicker">${icon(section.key)}<span>${esc(section.label)}</span></p>
      ${section.subtitle ? `<h2 id="${section.key}-h" class="opener-title">${inline(section.subtitle)}</h2>` : `<h2 id="${section.key}-h" class="opener-title sr-only">${esc(section.label)}</h2>`}
    </div>
    ${bootie ? bootieSpot(bootie, bubble) : ''}
  </header>`;
}

function bootieSpot(src, bubble) {
  return `
    <figure class="bootie" data-bootie>
      ${bubble ? `<figcaption class="bootie-bubble">${esc(bubble)}</figcaption>` : ''}
      <img src="${src}" alt="בוטי, הרובוט של המדור" width="88" height="88" decoding="async">
    </figure>`;
}

// ---- sections ----

function renderNews(s) {
  const items = s.items
    .map((it, i) =>
      withCtx('news', it.title, () => `
      <article class="news-item${i === 0 ? ' is-lead' : ''}" data-item-title="${esc(it.title)}">
        <span class="news-index" aria-hidden="true">${i + 1}</span>
        <h3 class="news-title">${inline(it.title)}</h3>
        ${it.summary ? `<p class="news-summary">${inline(it.summary)}</p>` : ''}
        ${it.why ? `<p class="why"><strong>למה זה חשוב</strong> ${inline(it.why)}</p>` : ''}
        ${it.links.length ? `<p class="sources">${it.links.map((l) => link(l.href, `<span>${esc(l.text)}&nbsp;<span aria-hidden="true">←</span></span>`, { cls: 'source' })).join('')}</p>` : ''}
      </article>`),
    )
    .join('');
  return `<div class="news-list">${items}</div>`;
}

function dateBadge(ev) {
  if (!ev.date) return `<div class="date-badge"><span class="date-day">${esc(ev.dateRaw)}</span></div>`;
  const s = new Date(ev.date.start + 'T12:00:00');
  const e = new Date(ev.date.end + 'T12:00:00');
  const day = ev.date.start === ev.date.end ? s.getDate() : `${s.getDate()}–${e.getDate()}`;
  return `<div class="date-badge">
      <span class="date-day" dir="ltr">${day}</span>
      <span class="date-month">${HE_MONTHS_SHORT[s.getMonth()]}</span>
      <span class="date-weekday">יום ${HE_DAYS[s.getDay()]}</span>
    </div>`;
}

function renderEvents(s, { formUrl }) {
  // group events that share a start date under one date marker
  const groups = [];
  for (const ev of s.events) {
    const key = ev.date?.start || ev.dateRaw;
    if (groups.at(-1)?.key === key) groups.at(-1).events.push(ev);
    else groups.push({ key, events: [ev] });
  }
  const tag = (p) =>
    p === 'free' ? '<span class="tag tag-free">חינם</span>' : p === 'paid' ? '<span class="tag tag-paid">בתשלום</span>' : '';
  const timeline = groups
    .map((g) => `
    <li class="tl-group" data-end="${esc(g.events.map((e) => e.date?.end || '').sort().at(-1))}">
      ${dateBadge(g.events[0])}
      <div class="tl-events">
        ${g.events
          .map((ev) =>
            withCtx('events', ev.name, () => `
          <div class="tl-event">
            <h3 class="tl-name">${t(ev.name)} ${tag(ev.price)}</h3>
            <p class="tl-where">${t(ev.where)}</p>
            ${ev.who ? `<p class="tl-who">${t(ev.who)}</p>` : ''}
            ${ev.link ? link(ev.link, '<span>להרשמה&nbsp;<span aria-hidden="true">←</span></span>', { cls: 'tl-register' }) : ''}
          </div>`),
          )
          .join('')}
      </div>
    </li>`)
    .join('');
  const notes = s.notes
    .map((n) => {
      const html = inline(n.replace(/\[לינק לטופס\]|\[טופס\]/, '')).replace(/\s*→\s*$/, '');
      return `<div class="events-suggest"><p>${html}</p>${ctaLink(formUrl, 'לטופס ההגשה', 'submit_event', 'events', 'tl-register')}</div>`;
    })
    .join('');
  return `<ol class="timeline">${timeline}</ol>${notes}`;
}

function ctaLink(href, text, cta, location, cls) {
  const ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${esc(href)}" class="${cls}"${ext} data-cta="${cta}" data-cta-location="${location}" data-section="${location}" data-item="${esc(text)}"><span>${text}&nbsp;<span aria-hidden="true">←</span></span></a>`;
}

function videoSlot(video, { poster, media = {} }) {
  if (!video) return '';
  const [title, duration] = video.title.split(/\s+·\s+/);
  const yt = video.href?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  const label = `<span class="video-meta"><span class="video-title">${esc(title)}</span>${duration ? `<span class="video-duration">${esc(duration)}</span>` : ''}</span>`;
  if (yt) {
    return `<div class="video-slot" data-video="youtube" data-video-id="${yt[1]}" data-item="${esc(title)}">
      <button type="button" class="video-play" aria-label="הפעלת הסרטון: ${esc(title)}">
        <img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360">
        <span class="play-icon" aria-hidden="true"></span>${label}
      </button></div>`;
  }
  if (video.href) {
    // Local/hosted file: nothing is downloaded until play; the poster carries the aspect ratio.
    const m = media[video.href] || {};
    const vertical = m.h > m.w;
    return `<figure class="video-slot is-file${vertical ? ' is-vertical' : ''}" data-video="file" data-item="${esc(title)}">
      <video controls preload="none" playsinline${m.poster ? ` poster="${esc(m.poster)}"` : ''}${m.w ? ` width="${m.w}" height="${m.h}"` : ''} src="${esc(video.href)}"></video>
      <figcaption class="video-caption"><span class="video-title">${esc(title)}</span>${duration ? `<span class="video-duration">${esc(duration)}</span>` : ''}</figcaption>
    </figure>`;
  }
  return `<div class="video-slot is-empty" data-item="${esc(title)}">
      <div class="video-empty"><img src="${poster}" alt="" width="64" height="64" loading="lazy"><span class="play-icon" aria-hidden="true"></span></div>
      ${label}<span class="video-soon">הסרטון יעלה בקרוב</span>
    </div>`;
}

function copyBlock(text, { label, item, variant = '' }) {
  return `
  <div class="prompt ${variant}" data-prompt data-item="${esc(item)}">
    ${label ? `<p class="prompt-label">${esc(label)}</p>` : ''}
    <p class="prompt-text">${esc(text).replace(/\[([^\]\n]{1,60})\]/g, '<mark class="fill">[$1]</mark>')}</p>
    <button type="button" class="copy-btn" data-copy aria-label="העתקת הטקסט">העתקה</button>
  </div>`;
}

function renderGuides(section, opts) {
  const many = section.guides.length > 1;
  return section.guides
    .map((g, i) => `
    <article class="guide${i ? ' guide-next' : ''}">
      ${many ? `<header class="guide-head"><p class="kicker">Use case ${i + 1}</p><h3 class="guide-title">${inline(g.title)}</h3></header>` : ''}
      ${renderGuide(g, opts)}
    </article>`)
    .join('');
}

function renderGuide(s, { bootie, media }) {
  const fields = s.fields.length
    ? `<dl class="guide-fields">${s.fields.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${inline(f.value)}</dd></div>`).join('')}</dl>`
    : '';
  const steps = s.steps.length
    ? `${s.stepsLabel ? `<h3 class="sub-label">${esc(s.stepsLabel)}</h3>` : ''}
    <ol class="steps">${s.steps
      .map((st, i) => `
      <li class="step">
        <span class="step-num" aria-hidden="true">${i + 1}</span>
        <div class="step-body">
          ${st.lead ? `<h4 class="step-lead">${inline(st.lead)}</h4>` : ''}
          <p>${inline(st.body)}</p>
          ${st.quote ? copyBlock(st.quote, { item: `${s.title} · step ${i + 1}`, variant: 'is-inline' }) : ''}
        </div>
      </li>`)
      .join('')}</ol>`
    : '';
  const tips = s.tips.map((t) => `<p class="tip"><strong>${esc(t.label)}</strong> ${inline(t.value)}</p>`).join('');
  const prompts = s.prompts.map((p, i) => copyBlock(p.text, { label: p.label, item: `${s.title} · prompt ${i + 1}`, variant: 'is-main' })).join('');
  const extra = s.extra.map((p) => `<p>${inline(p)}</p>`).join('');
  return withCtx('guide', s.title || 'guide', () => `
    ${fields}
    ${videoSlot(s.video, { poster: bootie, media })}
    ${steps}${extra}${tips}${prompts}
    ${s.teaser ? `<p class="teaser"><span>בגיליון הבא</span> ${inline(s.teaser.replace(/^בגיליון הבא:\s*/, ''))}</p>` : ''}`);
}

function renderConcept(s) {
  return withCtx('concept', s.subtitle || 'concept', () => `
  <div class="concept-box">
    ${s.rows.slice(0, 1).map(row).join('')}
    ${s.list ? `
      ${s.list.label ? `<h3 class="sub-label">${esc(s.list.label)}</h3>` : ''}
      <ul class="concept-list">${s.list.items.map((it) => `<li>${it.term ? `<strong dir="ltr">${esc(it.term)}</strong>` : ''}<span>${inline(it.text)}</span></li>`).join('')}</ul>` : ''}
    ${s.rows.slice(1).map(row).join('')}
    ${s.links.length ? `<p class="concept-links">${s.links.map((l) => link(l.href, `<span>${esc(l.text)}&nbsp;<span aria-hidden="true">←</span></span>`, { cls: 'source', item: l.text })).join('')}</p>` : ''}
  </div>`);
  function row(r) {
    return r.label ? `<div class="concept-row"><h3>${esc(r.label)}</h3><p>${inline(r.value)}</p></div>` : `<p>${inline(r.value)}</p>`;
  }
}

// ---- page ----

const SECTION_ORDER = ['news', 'events', 'guide', 'concept'];

function tocCount(issue, key) {
  const s = issue.sections[key];
  if (key === 'news') return `${s.items.length} ידיעות`;
  if (key === 'events') return `${s.events.length} אירועים`;
  if (key === 'guide' && s.guides.length > 1) return `<span dir="ltr">${s.guides.length} use cases</span>`;
  return s.subtitle;
}

export function clubLockup(logo, { dark = false } = {}) {
  return `<a class="lockup${dark ? ' is-dark' : ''}" href="https://ruec.co.il/ai/" target="_blank" rel="noopener" data-section="header" data-item="club-logo">
      <img src="${logo}" alt="" width="34" height="43">
      <span><strong>מועדון היזמות</strong><span>אוניברסיטת רייכמן · מדור החדשנות וה-AI</span></span>
    </a>`;
}

export function renderIssue(issue, opts) {
  const { site, assetBase, css, js, analytics, forms, bootie, media, pdfName, ogName, prev, next } = opts;
  const url = `${site}/${issue.slug}/`;
  const ogUrl = `${site}/${issue.slug}/${ogName}`;
  const title = `גיליון #${issue.number}: ${issue.title}`;
  const n = (k) => SECTION_ORDER.indexOf(k) + 1;
  const sec = (key, inner, extraCls = '') =>
    `<section id="${key}" class="section section-${key} ${extraCls}" data-track-section="${key}" aria-labelledby="${key}-h">${inner}</section>`;
  const S = issue.sections;

  const body = `
<a class="skip" href="#news">דלגו לתוכן</a>
<div class="progress" aria-hidden="true"><span></span></div>
<header class="masthead has-photo">
  <div class="mast-inner">
    ${clubLockup(`${assetBase}/logo.png`, { dark: true })}
    <p class="mast-meta"><span>גיליון ${issue.number}</span><span>${heDate(issue.date)}</span><span>${issue.readMinutes} דק׳ קריאה</span></p>
    <h1 class="mast-title">${esc(issue.title)}</h1>
    ${issue.description ? `<p class="mast-desc">${t(issue.description)}</p>` : ''}
  </div>
</header>

<main class="page">
  <nav class="toc" aria-label="בגיליון הזה">
    <p class="toc-label">בגיליון הזה</p>
    <ol>${SECTION_ORDER.map((k) => `<li><a href="#${k}" data-toc="${k}"><span class="toc-n">0${n(k)}</span><span class="toc-t">${esc(S[k].label)}</span><span class="toc-d">${inline(tocCount(issue, k))}</span></a></li>`).join('')}</ol>
  </nav>

  ${sec('news', opener(S.news, 1) + renderNews(S.news))}
  ${sec('events', opener(S.events, 2) + renderEvents(S.events, { formUrl: forms.event }))}
  ${sec('guide', opener(S.guide, 3) + renderGuides(S.guide, { bootie, media }))}
  ${sec('concept', opener(S.concept, 4) + renderConcept(S.concept))}

  <section class="closing" data-track-section="closing">
    <div class="closing-card">
      <img class="closing-bootie" src="${assetBase}/bootie-megaphone.webp" alt="בוטי עם מגפון" width="200" height="200" loading="lazy" decoding="async">
      <div class="closing-text">
        ${issue.outro ? `<p class="outro">${inline(issue.outro)}</p>` : ''}
        <div class="closing-ctas">
          ${ctaLink(forms.event, 'הגישו אירוע', 'submit_event', 'closing', 'btn btn-primary')}
          ${ctaLink(forms.share, 'הציעו use case', 'suggest_use_case', 'closing', 'btn btn-primary')}
        </div>
      </div>
    </div>
    <div class="closing-actions">
      ${pdfName ? `<a class="btn btn-ghost" href="${pdfName}" download data-cta="pdf_download" data-cta-location="closing">הורדת PDF</a>` : ''}
      <a class="btn btn-ghost" href="https://wa.me/?text=${encodeURIComponent(`${title}\n${url}?utm_source=whatsapp&utm_medium=share`)}" target="_blank" rel="noopener" data-cta="share_whatsapp" data-cta-location="closing" data-section="closing" data-item="share_whatsapp">שיתוף בוואטסאפ</a>
    </div>
  </section>
</main>

<footer class="footer">
  ${clubLockup(`${assetBase}/logo.png`)}
  <nav class="footer-nav">
    ${prev ? `<a href="../${prev.slug}/">← גיליון ${prev.number}</a>` : '<span></span>'}
    <a href="../">כל הגיליונות</a>
    ${next ? `<a href="../${next.slug}/">גיליון ${next.number} →</a>` : '<span></span>'}
  </nav>
</footer>`;

  return tagLinks(
    page({
      title,
      description: issue.description,
      url,
      image: ogUrl,
      css,
      body,
      js,
      analytics: { ...analytics, issue: issue.number, slug: issue.slug },
      bodyClass: 'issue',
    }),
  );
}

export function renderArchive(issues, { site, assetBase, css, js, analytics, ogName }) {
  const [latest, ...rest] = issues;
  const body = `
<header class="masthead has-photo is-archive">
  <div class="mast-inner">
    ${clubLockup(`${assetBase}/logo.png`, { dark: true })}
    <h1 class="mast-title">הניוזלטר של מדור החדשנות וה-AI</h1>
    <p class="mast-desc">כל שבוע: מה קרה ב-AI, אילו אירועים שווים את הערב שלכם, מדריך אחד שאפשר ליישם היום ומושג אחד שכדאי להכיר.</p>
  </div>
</header>
<main class="page archive">
  ${latest ? `
  <a class="archive-latest" href="${latest.slug}/" data-section="archive" data-item="issue-${latest.number}">
    <span class="kicker">הגיליון האחרון · ${dotDate(latest.date)}</span>
    <span class="archive-num">#${latest.number}</span>
    <strong>${esc(latest.title)}</strong>
    <span class="archive-desc">${t(latest.description)}</span>
    <span class="text-cta">לקריאה ←</span>
  </a>` : '<p>עוד אין גיליונות.</p>'}
  ${rest.length ? `<h2 class="sub-label">גיליונות קודמים</h2>
  <ol class="archive-list">${rest.map((i) => `<li><a href="${i.slug}/" data-section="archive" data-item="issue-${i.number}"><span class="archive-n">#${i.number}</span><span class="archive-t">${esc(i.title)}</span><span class="archive-d">${dotDate(i.date)}</span></a></li>`).join('')}</ol>` : ''}
</main>
<footer class="footer">${clubLockup(`${assetBase}/logo.png`)}</footer>`;
  return page({
    title: 'ניוזלטר מדור החדשנות וה-AI · מועדון היזמות רייכמן',
    description: 'ארכיון הגיליונות של הניוזלטר השבועי של מדור החדשנות וה-AI, מועדון היזמות באוניברסיטת רייכמן.',
    url: `${site}/`,
    image: latest ? `${site}/${latest.slug}/${ogName}` : '',
    css,
    body,
    js,
    analytics: { ...analytics, page: 'archive' },
    bodyClass: 'archive-page',
  });
}

export function renderRedirect(issue, { site, ogName }) {
  const target = `/${issue.slug}/`;
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>גיליון #${issue.number}: ${esc(issue.title)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${site}${target}">
<meta property="og:title" content="גיליון #${issue.number}: ${esc(issue.title)}">
<meta property="og:description" content="${esc(issue.description)}">
<meta property="og:image" content="${site}${target}${ogName}">
<meta property="og:url" content="${site}${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
</head><body><a href="${target}">לגיליון האחרון</a></body></html>`;
}

export function page({ title, description, url, image, css, body, js, analytics, bodyClass }) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0F2D96">
<meta property="og:type" content="article">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="מועדון היזמות · מדור החדשנות וה-AI">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
${image ? `<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">` : ''}
<link rel="icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@200;300;400;600;700&display=swap">
<style>${css}</style>
</head>
<body class="${bodyClass}">
${body}
<script>window.NL=${JSON.stringify(analytics)};</script>
<script>${js}</script>
</body>
</html>`;
}

/** Safety net: stamp any outbound link that still lacks tracking attributes. */
export function tagLinks(html) {
  return html.replace(/<a\s+(?![^>]*data-section)([^>]*href="https?:[^"]*"[^>]*)>/g, (m, attrs) => {
    console.warn('  ! untracked link tagged as section=other:', attrs.match(/href="([^"]+)"/)?.[1]);
    return `<a ${attrs} data-section="other" data-item="">`;
  });
}

export const readAsset = (p) => fs.readFileSync(p, 'utf8');
