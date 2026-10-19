// npm run new [YYYY-MM-DD] — start next week's issue from content/TEMPLATE.md.
// Default date: 7 days after the latest issue (or today if there are none); number: latest + 1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'content/issues');
const existing = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
const last = existing.at(-1);
const lastNum = last ? Number(matter.read(path.join(dir, last)).data.issue) : 0;

let date = process.argv[2];
if (!date) {
  const d = last ? new Date(last.slice(0, 10) + 'T12:00:00Z') : new Date();
  if (last) d.setUTCDate(d.getUTCDate() + 7);
  date = d.toISOString().slice(0, 10);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('date must be YYYY-MM-DD');

const out = path.join(dir, `${date}.md`);
if (fs.existsSync(out)) {
  console.error(`${path.relative(ROOT, out)} already exists`);
  process.exit(1);
}
const tpl = fs.readFileSync(path.join(ROOT, 'content/TEMPLATE.md'), 'utf8');
fs.writeFileSync(out, tpl.replace('{{issue}}', String(lastNum + 1)).replace('{{date}}', date));
console.log(`created ${path.relative(ROOT, out)}  (issue #${lastNum + 1}) — rules: EDITORIAL.md, then: npm run check`);
