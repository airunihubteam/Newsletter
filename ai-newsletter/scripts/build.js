// content/issues/*.md → dist/
//   dist/<slug>/index.html   the issue page
//   dist/<slug>/og.jpg       WhatsApp / social preview card     (skip with --no-og)
//   dist/<slug>/<name>.pdf   printable Hebrew PDF               (skip with --no-pdf)
//   dist/index.html          archive of all issues
//   dist/latest/index.html   redirect to the newest issue (+ an HTTP redirect in dist/vercel.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { parseIssue } from '../src/parse.js';
import sharp from 'sharp';
import { renderIssue, renderArchive, renderRedirect, clubLockup } from '../src/render.js';
import { FORMS, renderForm } from '../src/forms.js';
import { checkIssue } from '../src/link-policy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));

const env = (k, d = '') => (process.env[k] || d).trim();
const config = {
  site: env('SITE_URL', 'http://localhost:4321').replace(/\/$/, ''),
  gaId: env('GA_MEASUREMENT_ID'),
};
const OG_NAME = 'og.jpg';
const pdfName = (issue) => `ruec-ai-newsletter-${String(issue.number).padStart(2, '0')}.pdf`;

const minifyCss = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();

function findBootie() {
  for (const ext of ['webp', 'png', 'svg', 'jpg']) {
    if (fs.existsSync(path.join(ROOT, 'assets', `bootie.${ext}`))) return `bootie.${ext}`;
  }
  return 'bootie-placeholder.svg';
}

async function main() {
  const t0 = Date.now();
  const files = fs.readdirSync(path.join(ROOT, 'content/issues')).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  const issues = files.map((f) => parseIssue(path.join(ROOT, 'content/issues', f))).sort((a, b) => b.date.localeCompare(a.date));
  const slugs = new Set();
  for (const i of issues) {
    if (slugs.has(i.slug)) throw new Error(`duplicate slug "${i.slug}"`);
    slugs.add(i.slug);
  }

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
  const bootie = findBootie();
  const assets = ['logo.png', bootie, 'bootie-megaphone.webp', 'hero-building-800.webp', 'hero-building-1600.webp'];
  for (const f of assets) fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(DIST, 'assets', f));

  // content/media → dist/media; a same-named .jpg next to a video is its poster (npm run poster).
  const media = {};
  const mediaDir = path.join(ROOT, 'content/media');
  if (fs.existsSync(mediaDir)) {
    fs.cpSync(mediaDir, path.join(DIST, 'media'), { recursive: true });
    for (const f of fs.readdirSync(mediaDir).filter((x) => /\.(mp4|webm|mov)$/i.test(x))) {
      const poster = f.replace(/\.\w+$/, '.jpg');
      const entry = {};
      if (fs.existsSync(path.join(mediaDir, poster))) {
        const m = await sharp(path.join(mediaDir, poster)).metadata();
        Object.assign(entry, { poster: `/media/${poster}`, w: m.width, h: m.height });
      } else console.warn(`  ! content/media/${f} has no poster — run npm run poster`);
      media[`/media/${f}`] = entry;
    }
  }

  const css = minifyCss(fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8'));
  const js = ['ui.js', 'analytics.js', 'forms.js']
    .map((f) => path.join(ROOT, 'src/client', f))
    .filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
  const analytics = { gaId: config.gaId };
  if (!config.gaId) console.warn('  ! GA_MEASUREMENT_ID not set — analytics events will only be logged to the console');
  const forms = Object.fromEntries(Object.entries(FORMS).map(([k, f]) => [k, `/${f.slug}/`]));
  const common = { site: config.site, assetBase: '/assets', css, js, analytics, forms, media, bootie: `/assets/${bootie}`, ogName: OG_NAME };
  issues.forEach((issue, i) => {
    const dir = path.join(DIST, issue.slug);
    fs.mkdirSync(dir, { recursive: true });
    const html = renderIssue(issue, {
      ...common,
      pdfName: args.has('--no-pdf') ? null : pdfName(issue),
      prev: issues[i + 1],
      next: issues[i - 1],
    });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`  ✓ ${issue.slug}/  (#${issue.number}, ${issue.date})`);
    const { errors, warnings } = checkIssue(issue);
    for (const p of [...errors, ...warnings]) console.warn(`    ! ${p}`);
    if (errors.length) console.warn(`    ! ${errors.length} rule error(s) — run npm run check (CI won't deploy this)`);
  });

  fs.writeFileSync(path.join(DIST, 'index.html'), renderArchive(issues, common));
  for (const [key, f] of Object.entries(FORMS)) {
    fs.mkdirSync(path.join(DIST, f.slug), { recursive: true });
    const lockup = clubLockup('/assets/logo.png', { dark: true });
    fs.writeFileSync(path.join(DIST, f.slug, 'index.html'), renderForm(key, { ...common, latest: issues[0], bodyLockup: lockup }));
    console.log(`  ✓ ${f.slug}/  (form)`);
  }
  if (issues[0]) {
    fs.mkdirSync(path.join(DIST, 'latest'), { recursive: true });
    fs.writeFileSync(path.join(DIST, 'latest/index.html'), renderRedirect(issues[0], common));
  }
  // Vercel config: /latest is a real HTTP redirect (so WhatsApp's scraper follows it to the issue's OG tags),
  // folder pages always end with "/" (their relative links depend on it), and cache headers.
  const folders = [...issues.map((i) => i.slug), ...Object.values(FORMS).map((f) => f.slug)];
  fs.writeFileSync(path.join(DIST, 'vercel.json'), JSON.stringify({
    // dist/ is already built: no framework, no install/build step on Vercel's side
    framework: null,
    installCommand: '',
    buildCommand: '',
    cleanUrls: false,
    redirects: [
      ...(issues[0] ? ['/latest', '/latest/'].map((source) => ({ source, destination: `/${issues[0].slug}/`, permanent: false })) : []),
      ...folders.map((f) => ({ source: `/${f}`, destination: `/${f}/`, permanent: true })),
    ],
    headers: [
      { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ] },
    ],
  }, null, 2));
  // The forms endpoint ships as a Vercel function next to the static files.
  fs.cpSync(path.join(ROOT, 'api'), path.join(DIST, 'api'), { recursive: true });

  if (!args.has('--no-og')) {
    const { renderOgImages } = await import('./og.js');
    await renderOgImages(issues, { dist: DIST, root: ROOT, name: OG_NAME });
  }
  if (!args.has('--no-pdf')) {
    const { renderPdfs } = await import('./pdf.js');
    await renderPdfs(issues, { dist: DIST, root: ROOT, name: pdfName, site: config.site, forms });
  }
  console.log(`built ${issues.length} issue(s) in ${Date.now() - t0}ms → dist/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
