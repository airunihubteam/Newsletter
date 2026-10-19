// npm run check [file…] — validate issues against EDITORIAL.md. Exits 1 on any error.
// With no arguments, checks every issue in content/issues/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIssue } from '../src/parse.js';
import { checkIssue } from '../src/link-policy.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'content/issues');
const files = process.argv.length > 2
  ? process.argv.slice(2)
  : fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).map((f) => path.join(dir, f));

let failed = 0;
for (const f of files) {
  let issue;
  try {
    issue = parseIssue(f);
  } catch (e) {
    console.log(`✗ ${path.basename(f)}\n    ${e.message}`);
    failed++;
    continue;
  }
  const { errors, warnings } = checkIssue(issue);
  console.log(`${errors.length ? '✗' : '✓'} ${path.basename(f)}  (#${issue.number})`);
  for (const e of errors) console.log(`    error   ${e}`);
  for (const w of warnings) console.log(`    warning ${w}`);
  if (errors.length) failed++;
}
if (failed) {
  console.log(`\n${failed} issue(s) break the rules in EDITORIAL.md`);
  process.exit(1);
}
