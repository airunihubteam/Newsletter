"""Rebuild assets/fonts/ (run once; the output is committed).

Noto Sans Hebrew has no Latin letters or digits, and reportlab has no font fallback,
so the PDF uses one merged font: Noto Sans (Latin) + Noto Sans Hebrew glyphs.
Usage: .venv/bin/pip install fonttools && .venv/bin/python scripts/fonts.py
"""
import urllib.request
from pathlib import Path
from fontTools.merge import Merger, Options

BASE = 'https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts'
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'fonts'
OUT.mkdir(parents=True, exist_ok=True)
tmp = OUT / '_src'
tmp.mkdir(exist_ok=True)

def fetch(family, weight):
    dst = tmp / f'{family}-{weight}.ttf'
    if not dst.exists():
        urllib.request.urlretrieve(f'{BASE}/{family}/hinted/ttf/{family}-{weight}.ttf', dst)
    return dst

for w in ['Regular', 'Bold']:
    merged = Merger(options=Options(drop_tables=['vmtx', 'vhea', 'MATH'])).merge(
        [str(fetch('NotoSans', w)), str(fetch('NotoSansHebrew', w))])
    merged.save(OUT / f'PDFSans-{w}.ttf')
light = fetch('NotoSansHebrew', 'Light')
(OUT / 'NotoSansHebrew-Light.ttf').write_bytes(light.read_bytes())
for f in tmp.iterdir():
    f.unlink()
tmp.rmdir()
print('fonts written to', OUT)
