// Node side of the PDF export: hands each parsed issue to scripts/pdf.py (reportlab + python-bidi).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function python(root) {
  if (process.env.PYTHON) return process.env.PYTHON;
  const venv = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  return fs.existsSync(venv) ? venv : 'python3';
}

export async function renderPdfs(issues, { dist, root, name, site, forms }) {
  const py = python(root);
  for (const issue of issues) {
    const out = path.join(dist, issue.slug, name(issue));
    const payload = JSON.stringify({
      issue,
      out,
      root,
      url: `${site}/${issue.slug}/`,
      formUrl: `${site}${forms.event}`,
      shareUrl: `${site}${forms.share}`,
    });
    const r = spawnSync(py, [path.join(root, 'scripts/pdf.py')], { input: payload, encoding: 'utf8' });
    if (r.status !== 0) {
      throw new Error(`PDF failed for ${issue.slug} (${py}):\n${r.stderr || r.error}\n` +
        'Install deps: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt');
    }
    console.log(`  ✓ ${issue.slug}/${name(issue)}  (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  }
}
