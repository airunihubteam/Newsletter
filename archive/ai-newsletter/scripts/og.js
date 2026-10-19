// OG image per issue (1200×630 JPEG): club logo + issue number + top 3 headlines.
// This is the card WhatsApp shows when the link is shared, so it is rendered by a
// real Chrome (correct Hebrew shaping and bidi), not by an SVG rasterizer.
// Chrome: local Google Chrome (channel "chrome"), or CHROME_PATH.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { esc, bidi } from '../src/render.js';

/** Shorten a headline for the card: keep the part before " — " / ", " when that is still meaningful. */
export function shortHeadline(title) {
  for (const sep of [' — ', ' – ', ', ', ': ']) {
    const i = title.indexOf(sep);
    if (i >= 12 && i <= 48) return title.slice(0, i);
  }
  return title;
}

function cardHtml(issue, { logo, bootie, building }) {
  const heads = (issue.ogHeadlines || issue.sections.news.items.slice(0, 3).map((i) => shortHeadline(i.title))).slice(0, 3);
  const [d, m, y] = issue.date.split('-').reverse();
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@200;400;700&display=block">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden; color: #fff;
    font-family: 'Noto Sans Hebrew', sans-serif;
    background: linear-gradient(180deg, rgba(15,45,150,.80), rgba(12,36,122,.93)), url('${building}') center 38% / cover, #0f2d96;
    padding: 56px 64px;
  }
  .bar { position: absolute; inset: 0 0 auto 0; height: 10px; background: #46a0d8; }
  .top { position: relative; display: flex; align-items: center; gap: 16px; }
  .top img { width: 50px; filter: brightness(0) invert(1); }
  .top strong { display: block; font-size: 28px; font-weight: 700; line-height: 1.2; }
  .top span { font-size: 21px; opacity: .8; }
  .num { position: relative; display: flex; align-items: baseline; gap: 22px; margin-top: 34px; }
  .num b { font-size: 104px; line-height: 1; font-weight: 200; }
  .num span { font-size: 26px; color: #cfe6f7; font-weight: 700; }
  ol { position: relative; list-style: none; padding: 0; margin-top: 26px; width: 860px; }
  li { display: flex; gap: 18px; align-items: baseline; font-size: 34px; line-height: 1.32; font-weight: 700;
       padding: 9px 0; border-top: 1px solid rgba(255,255,255,.16); }
  li i { font-style: normal; color: #46a0d8; font-weight: 400; font-size: 26px; flex: none; width: 24px; }
  li span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .bootie { position: absolute; left: 60px; bottom: 56px; width: 200px; height: 200px; object-fit: cover; border: 3px solid #fff; }
</style></head><body>
  <div class="bar"></div>
  <div class="top"><img src="${logo}" alt=""><div><strong>מועדון היזמות · אוניברסיטת רייכמן</strong><span>הניוזלטר של מדור החדשנות וה-AI</span></div></div>
  <div class="num"><b>גיליון #${issue.number}</b><span>${d}.${m}.${y}</span></div>
  <ol>${heads.map((h, i) => `<li><i>${i + 1}</i><span>${bidi(esc(h))}</span></li>`).join('')}</ol>
  <img class="bootie" src="${bootie}" alt="">
</body></html>`;
}

const dataUri = (file) => {
  const ext = path.extname(file).slice(1).replace('svg', 'svg+xml').replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
};

export async function renderOgImages(issues, { dist, root, name }) {
  const bootieFile = fs.readdirSync(path.join(dist, 'assets')).find((f) => /^bootie\.(webp|png|svg|jpg)$/.test(f)) || 'bootie-placeholder.svg';
  const assets = {
    logo: dataUri(path.join(root, 'assets/logo.png')),
    bootie: dataUri(path.join(dist, 'assets', bootieFile)),
    building: dataUri(path.join(root, 'assets/hero-building-1200.jpg')),
  };
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (const issue of issues) {
      await page.setContent(cardHtml(issue, assets), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const out = path.join(dist, issue.slug, name);
      await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
      console.log(`  ✓ ${issue.slug}/${name}  (${Math.round(fs.statSync(out).size / 1024)} KB)`);
    }
  } finally {
    await browser.close();
  }
}
