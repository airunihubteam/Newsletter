// npm run poster — for every content/media/*.mp4 without a matching .jpg, grab a frame
// (at 1.5s) with Chrome and save it next to the video. The poster is what readers see
// before tapping play (the video itself is not downloaded until then), and its size tells
// the page the video's aspect ratio (vertical videos get a vertical frame).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'content/media');
const AT = Number(process.env.POSTER_AT || 1.5);

const videos = fs.existsSync(MEDIA) ? fs.readdirSync(MEDIA).filter((f) => /\.(mp4|webm|mov)$/i.test(f)) : [];
const todo = videos.filter((f) => !fs.existsSync(path.join(MEDIA, f.replace(/\.\w+$/, '.jpg'))) || process.argv.includes('--force'));
if (!todo.length) {
  console.log('posters up to date');
  process.exit(0);
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
const page = await browser.newPage();
// Serve page and video from one fake origin so the canvas isn't tainted.
await page.route('http://media.local/**', (route) => {
  const name = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
  if (!name) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
  // Byte-range support, or the browser can't seek inside the video.
  const buf = fs.readFileSync(path.join(MEDIA, name));
  const m = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
  if (!m) return route.fulfill({ contentType: 'video/mp4', headers: { 'Accept-Ranges': 'bytes' }, body: buf });
  const start = +m[1];
  const end = m[2] ? Math.min(+m[2], buf.length - 1) : buf.length - 1;
  return route.fulfill({
    status: 206,
    contentType: 'video/mp4',
    headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${buf.length}` },
    body: buf.subarray(start, end + 1),
  });
});
await page.goto('http://media.local/');
for (const f of todo) {
  const dataUrl = await page.evaluate(async ({ src, at }) => {
    const v = document.createElement('video');
    v.muted = true;
    v.src = src;
    await new Promise((ok, fail) => { v.onloadeddata = ok; v.onerror = () => fail(new Error('cannot decode video')); });
    v.currentTime = Math.min(at, v.duration / 2);
    await new Promise((ok) => (v.onseeked = ok));
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.78);
  }, { src: `http://media.local/${encodeURIComponent(f)}`, at: AT });
  const out = path.join(MEDIA, f.replace(/\.\w+$/, '.jpg'));
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`  ✓ ${path.relative(ROOT, out)}`);
}
await browser.close();
