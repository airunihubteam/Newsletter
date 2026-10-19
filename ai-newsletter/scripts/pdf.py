"""Printable Hebrew PDF for one issue (A4, RTL), following the hebrew-document-generator
skill's reportlab path:

* One merged TTF (Noto Sans Latin + Noto Sans Hebrew glyphs) so mixed Hebrew/English
  lines render in one font -- Noto Sans Hebrew alone has no Latin letters or digits.
* We wrap text OURSELVES in logical order (measuring with stringWidth), then run
  get_display() once per finished line, right before drawRightString(). Running bidi
  on a whole paragraph before wrapping would put the line order upside down.
* base_dir='R' on every line: a Hebrew sentence that starts with "Gemini 4 ..." must
  still flow right-to-left.
* bidi.algorithm.get_display (the pure-Python implementation shipped in python-bidi
  0.6.x) is used deliberately: it mirrors brackets in RTL runs; the Rust-backed
  top-level bidi.get_display in 0.6.x does not, which renders "(Shopify ...)" as ")Shopify ...(".

Input: JSON on stdin {issue, out, root, site, url, formUrl}.
"""
import json
import re
import sys
from pathlib import Path

from bidi.algorithm import get_display
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

NAVY = HexColor('#0F2D96')
SKY = HexColor('#46A0D8')
TEXT = HexColor('#272727')
MUTED = HexColor('#69727D')
TINT = HexColor('#EEF2FA')
LINE = HexColor('#E3E6EE')
NIGHT = HexColor('#000223')
ICE = HexColor('#9FD3F0')

HEB = re.compile(r'[֐-׿]')
LINK = re.compile(r'\[([^\]]+)\](?:\(([^)]*)\))?')
HE_MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']


def plain(s):
    """Markdown inline → plain text (the PDF carries links as separate clickable chunks)."""
    if not s:
        return ''
    s = LINK.sub(r'\1', s)
    s = re.sub(r'\*\*|__|(?<!\w)[*_](?!\s)|(?<!\s)[*_](?!\w)', '', s)
    return s.replace('→', '').replace('←', '').strip()


def is_url(h):
    return bool(h) and h.startswith(('http://', 'https://'))


class Doc:
    W, H = A4
    M = 18 * mm          # side margins
    TOP = 18 * mm
    BOTTOM = 20 * mm

    def __init__(self, out, root, footer):
        fonts = Path(root) / 'assets' / 'fonts'
        pdfmetrics.registerFont(TTFont('R', str(fonts / 'PDFSans-Regular.ttf')))
        pdfmetrics.registerFont(TTFont('B', str(fonts / 'PDFSans-Bold.ttf')))
        pdfmetrics.registerFont(TTFont('L', str(fonts / 'NotoSansHebrew-Light.ttf')))  # Hebrew-only glyphs
        self.c = canvas.Canvas(out, pagesize=A4)
        self.right = self.W - self.M
        self.left = self.M
        self.footer = footer
        self.page = 1
        self.y = self.H - self.TOP

    # ---- primitives ----
    @staticmethod
    def font_for(text, font):
        # The light weight only has Hebrew glyphs; fall back to regular when Latin/digits appear.
        return 'R' if font == 'L' and re.search(r'[A-Za-z0-9]', text) else font

    def width(self, text, font, size):
        return pdfmetrics.stringWidth(text, self.font_for(text, font), size)

    def wrap(self, text, font, size, maxw):
        lines, cur = [], ''
        for word in text.split():
            trial = f'{cur} {word}' if cur else word
            if self.width(trial, font, size) <= maxw:
                cur = trial
                continue
            if cur:
                lines.append(cur)
            while self.width(word, font, size) > maxw:  # a single over-long token (URL)
                cut = len(word)
                while cut > 1 and self.width(word[:cut], font, size) > maxw:
                    cut -= 1
                lines.append(word[:cut])
                word = word[cut:]
            cur = word
        if cur:
            lines.append(cur)
        return lines or ['']

    def draw(self, text, x_right, y, font, size, color):
        self.c.setFont(self.font_for(text, font), size)
        self.c.setFillColor(color)
        # Visual reorder per finished line, RTL base direction.
        self.c.drawRightString(x_right, y, get_display(text, base_dir='R') if HEB.search(text) else text)

    def new_page(self):
        self.draw_footer()
        self.c.showPage()
        self.page += 1
        self.y = self.H - self.TOP

    def ensure(self, h):
        if self.y - h < self.BOTTOM:
            self.new_page()

    def space(self, h):
        self.y -= h

    def draw_footer(self):
        c = self.c
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        c.line(self.left, 13 * mm, self.right, 13 * mm)
        self.draw(self.footer, self.right, 8.5 * mm, 'R', 8, MUTED)
        c.setFont('R', 8)
        c.setFillColor(MUTED)
        c.drawString(self.left, 8.5 * mm, str(self.page))

    def para(self, text, font='R', size=10.5, color=TEXT, lead=None, inset_r=0, inset_l=0,
             bg=None, bar=None, pad=0, link=None, keep=1, raw=False):
        """Wrapped RTL paragraph. With bg, every line paints its own slice of the box, so a
        box can break across pages. Returns nothing; advances self.y."""
        text = text.strip() if raw else plain(text)
        if not text:
            return
        lead = lead or size * 1.55
        inner = 4 * mm if bg else 0  # horizontal padding inside a colored box
        x_r = self.right - inset_r - inner - (2 * mm if bar else 0)
        x_l = self.left + inset_l + inner
        lines = self.wrap(text, font, size, x_r - x_l)
        self.ensure(lead * min(keep, len(lines)) + (pad if bg else 0))
        if bg and pad:
            self.box_slice(pad, bg, bar, inset_r, inset_l)
        for line in lines:
            self.ensure(lead)
            if bg:
                self.box_slice(lead, bg, bar, inset_r, inset_l)
            base = self.y - lead + (lead - size) / 2 + size * 0.22
            self.draw(line, x_r, base, font, size, color)
            if link:
                w = self.width(line, font, size)
                self.c.linkURL(link, (x_r - w, base - 2, x_r, base + size), relative=0)
            self.y -= lead
        if bg and pad:
            self.box_slice(pad, bg, bar, inset_r, inset_l)

    def box_slice(self, h, bg, bar, inset_r, inset_l):
        c = self.c
        x0, x1 = self.left + inset_l, self.right - inset_r
        c.setFillColor(bg)
        c.rect(x0, self.y - h, x1 - x0, h, stroke=0, fill=1)
        if bar:
            c.setFillColor(bar)
            c.rect(x1 - 1.2 * mm, self.y - h, 1.2 * mm, h, stroke=0, fill=1)

    def box_pad(self, h, bg, bar=None, inset_r=0, inset_l=0):
        self.ensure(h)
        self.box_slice(h, bg, bar, inset_r, inset_l)
        self.y -= h

    def chunks(self, items, size=9.5, font='B', color=NAVY, inset_r=0, bg=None, label=None, gap=4 * mm):
        """A right-to-left row of short clickable labels (sources, links). Wraps as needed."""
        lead = size * 1.9
        x = self.right - inset_r
        self.ensure(lead)
        if bg:
            self.box_slice(lead, bg, None, 0, 0)
        base = self.y - lead + size * 0.55
        row = [(label, None, MUTED, 'R')] if label else []
        dim = ICE if bg else MUTED  # placeholder (no URL yet)
        row += [(plain(t), href, color if is_url(href) else dim, font if is_url(href) else 'R') for t, href in items]
        for text, href, col, f in row:
            w = self.width(text, f, size)
            if x - w < self.left + (4 * mm if bg else 0):
                self.y -= lead
                self.ensure(lead)
                if bg:
                    self.box_slice(lead, bg, None, 0, 0)
                base = self.y - lead + size * 0.55
                x = self.right - inset_r
            self.draw(text, x, base, f, size, col)
            if href and is_url(href):
                self.c.setStrokeColor(col)
                self.c.setLineWidth(0.5)
                self.c.line(x - w, base - 1.6, x, base - 1.6)
                self.c.linkURL(href, (x - w, base - 3, x, base + size), relative=0)
            x -= w + gap
        self.y -= lead

    def rule(self, color=LINE, width=0.6, before=3 * mm, after=3 * mm):
        self.space(before)
        self.c.setStrokeColor(color)
        self.c.setLineWidth(width)
        self.c.line(self.left, self.y, self.right, self.y)
        self.space(after)


# ---------------- issue layout ----------------

def section_opener(d, n, label, subtitle):
    d.ensure(32 * mm)  # never leave an opener alone at the bottom of a page
    d.space(6 * mm)
    c = d.c
    c.setFillColor(NAVY)
    c.rect(d.right - 14 * mm, d.y - 1.2 * mm, 14 * mm, 1.2 * mm, stroke=0, fill=1)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(d.left, d.y - 0.6 * mm, d.right - 14 * mm, d.y - 0.6 * mm)
    d.space(5 * mm)
    top = d.y
    c.setFont('R', 30)
    c.setFillColor(NAVY)
    num = f'0{n}'
    c.drawRightString(d.right, top - 26, num)
    off = pdfmetrics.stringWidth(num, 'R', 30) + 5 * mm
    d.draw(label, d.right - off, top - 10, 'B', 9.5, NAVY)
    if subtitle:
        d.y = top - 13
        d.para(subtitle, 'B', 14, TEXT, lead=19, inset_r=off)
    d.y = min(d.y, top - 30)
    d.space(3 * mm)


def render_guide(d, g, data):
    c = d.c
    for f in g['fields']:
        d.para(f['label'], 'B', 9, NAVY, lead=13, keep=2)
        d.para(f['value'], 'R', 10.5, TEXT, lead=16)
        d.space(1.5 * mm)
    if g.get('video'):
        v = g['video']
        d.space(1 * mm)
        d.box_pad(2 * mm, NIGHT)
        title = plain(v['title'])
        href = v.get('href') or ''
        online = is_url(href) or href.startswith('/media/')
        label = (title if title.startswith('סרטון') else f'סרטון: {title}') + (' — לצפייה בגרסה המקוונת' if online else ' — בקרוב בגרסה המקוונת')
        d.para(label, 'B', 10, white, lead=15, bg=NIGHT, pad=0, link=href if is_url(href) else (data['url'] if online else None))
        d.box_pad(2 * mm, NIGHT)
    if g['steps']:
        d.space(3 * mm)
        if g.get('stepsLabel'):
            d.para(g['stepsLabel'], 'B', 9.5, NAVY, lead=14, keep=3)
            d.space(1 * mm)
        for i, st in enumerate(g['steps']):
            d.ensure(24)
            sq = 6 * mm
            c.setFillColor(NAVY)
            c.rect(d.right - sq, d.y - sq - 1, sq, sq, stroke=0, fill=1)
            c.setFont('B', 10)
            c.setFillColor(white)
            c.drawCentredString(d.right - sq / 2, d.y - sq + 3.2, str(i + 1))
            ins = sq + 3.5 * mm
            if st.get('lead'):
                d.para(st['lead'], 'B', 11, TEXT, lead=16, inset_r=ins)
            d.para(st['body'], 'R', 10.5, TEXT, lead=16, inset_r=ins)
            if st.get('quote'):
                d.space(1.5 * mm)
                d.box_pad(2 * mm, TINT, NAVY, inset_r=ins)
                d.para(st['quote'], 'R', 10, TEXT, lead=15.5, bg=TINT, bar=NAVY, inset_r=ins, raw=True)
                d.box_pad(2 * mm, TINT, NAVY, inset_r=ins)
            d.space(2.5 * mm)
    for tip in g['tips']:
        d.box_pad(2 * mm, TINT)
        d.para(f"{tip['label']}: {tip['value']}", 'R', 10, TEXT, lead=15.5, bg=TINT)
        d.box_pad(2 * mm, TINT)
        d.space(2 * mm)
    for p in g['prompts']:
        d.space(1 * mm)
        d.box_pad(3 * mm, NIGHT)
        d.para(p['label'], 'B', 8.5, ICE, lead=13, bg=NIGHT, pad=0)
        d.para(p['text'], 'R', 11, white, lead=17.5, bg=NIGHT, raw=True)
        d.box_pad(3 * mm, NIGHT)
        d.space(2 * mm)
    if g.get('teaser'):
        d.para(g['teaser'], 'R', 9.5, MUTED, lead=14.5)


def build(data):
    issue, root = data['issue'], data['root']
    S = issue['sections']
    yyyy, mm_, dd = issue['date'].split('-')
    d = Doc(data['out'], root, f"ניוזלטר מדור החדשנות וה-AI · מועדון היזמות, אוניברסיטת רייכמן · גיליון #{issue['number']}")
    c = d.c
    c.setTitle(f"גיליון #{issue['number']}: {issue['title']}")
    c.setAuthor('מועדון היזמות, אוניברסיטת רייכמן — מדור החדשנות וה-AI')
    c.setSubject(issue['description'])

    # ---- header ----
    logo = str(Path(root) / 'assets' / 'logo.png')
    lh = 15 * mm
    c.drawImage(logo, d.right - lh * 113 / 142, d.y - lh, lh * 113 / 142, lh, mask='auto')
    tx = d.right - lh * 113 / 142 - 3.5 * mm
    d.draw('מועדון היזמות · אוניברסיטת רייכמן', tx, d.y - 6 * mm, 'B', 11, NAVY)
    d.draw('מדור החדשנות וה-AI', tx, d.y - 11 * mm, 'R', 9.5, MUTED)
    c.setFont('R', 9.5)
    c.setFillColor(MUTED)
    meta = f"{dd}.{mm_}.{yyyy}"
    c.drawString(d.left, d.y - 11 * mm, meta)
    d.draw(f"גיליון #{issue['number']}", d.left + pdfmetrics.stringWidth(meta, 'R', 9.5) + 3 * mm
           + d.width(f"גיליון #{issue['number']}", 'B', 9.5), d.y - 11 * mm, 'B', 9.5, NAVY)
    d.space(lh + 4 * mm)
    c.setFillColor(NAVY)
    c.rect(d.left, d.y - 1.4 * mm, d.right - d.left, 1.4 * mm, stroke=0, fill=1)
    d.space(9 * mm)
    d.para(issue['title'], 'L', 28, TEXT, lead=36)
    d.space(1 * mm)
    d.para(issue['description'], 'R', 11.5, MUTED, lead=18)
    d.space(2 * mm)
    toc = ' · '.join(f"0{i + 1} {S[k]['label']}" for i, k in enumerate(['news', 'events', 'guide', 'concept']))
    d.para(f'בגיליון: {toc}', 'R', 9.5, NAVY, lead=15)
    # A trailing "/" is a neutral at the end of an RTL line and would jump to the far left of the URL.
    d.para(f"הגרסה המלאה, עם סרטונים וקישורים: {data['url'].rstrip('/')}", 'R', 9, MUTED, lead=14, link=data['url'])

    # ---- 01 news ----
    section_opener(d, 1, S['news']['label'], S['news'].get('subtitle'))
    for i, it in enumerate(S['news']['items']):
        if i:
            d.rule(before=2.5 * mm, after=3 * mm)
        first = next((l['href'] for l in it['links'] if is_url(l['href'])), None)
        d.para(f"{i + 1}.  {it['title']}", 'B', 12.5, TEXT, lead=18, link=first, keep=3)
        d.space(0.8 * mm)
        d.para(it['summary'], 'R', 10.5, TEXT, lead=16.5)
        if it.get('why'):
            d.space(1.6 * mm)
            d.para('למה זה חשוב', 'B', 8.5, NAVY, lead=13, bg=TINT, bar=NAVY, pad=0, keep=2)
            d.para(it['why'], 'R', 10, TEXT, lead=15.5, bg=TINT, bar=NAVY)
            d.box_pad(2 * mm, TINT, NAVY)
        if it['links']:
            d.chunks([(l['text'], l['href']) for l in it['links']])

    # ---- 02 events ----
    section_opener(d, 2, S['events']['label'], S['events'].get('subtitle'))
    col = 24 * mm
    for ev in S['events']['events']:
        lead = 15.5
        d.ensure(lead * 3 + 4 * mm)
        top = d.y
        if ev.get('date'):
            s = ev['date']['start'].split('-')
            e = ev['date']['end'].split('-')
            day = s[2].lstrip('0') if s == e else f"{s[2].lstrip('0')}–{e[2].lstrip('0')}"
            c.setFont('R', 16)
            c.setFillColor(NAVY)
            c.drawRightString(d.right, top - 15, day)
            d.draw(HE_MONTHS[int(s[1]) - 1], d.right, top - 26, 'B', 8.5, TEXT)
        else:
            d.draw(ev['dateRaw'], d.right, top - 15, 'B', 10, NAVY)
        d.space(2 * mm)
        name_top = d.y
        d.para(ev['name'], 'B', 11.5, TEXT, lead=16.5, inset_r=col, link=ev.get('link'))
        if ev.get('price') in ('free', 'paid'):
            tag = 'חינם' if ev['price'] == 'free' else 'בתשלום'
            tw = d.width(tag, 'B', 8) + 3 * mm
            c.setFillColor(NAVY if ev['price'] == 'free' else MUTED)
            c.rect(d.left, name_top - 13, tw, 11, stroke=0, fill=1)
            d.draw(tag, d.left + tw - 1.5 * mm, name_top - 10, 'B', 8, white)
        d.para(' · '.join(x for x in [ev.get('where'), ev.get('who')] if x), 'R', 9.5, MUTED, lead=14.5, inset_r=col)
        if ev.get('link'):
            d.chunks([('להרשמה', ev['link'])], size=9, inset_r=col)
        d.y = min(d.y, top - 30)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(d.left, d.y - 1 * mm, d.right, d.y - 1 * mm)
        d.space(2 * mm)
    for note in S['events'].get('notes', []):
        d.space(2 * mm)
        txt = re.sub(r'\[לינק לטופס\]|\[טופס\]', '', note)
        d.box_pad(2 * mm, TINT)
        d.para(f"{plain(txt)} {data['formUrl'].rstrip('/')}", 'R', 10, TEXT, lead=15.5,
               bg=TINT, pad=0, inset_r=0, link=data['formUrl'] if is_url(data['formUrl']) else None)
        d.box_pad(2 * mm, TINT)

    # ---- 03 guide(s) ----
    sec = S['guide']
    section_opener(d, 3, sec['label'], sec.get('subtitle'))
    many = len(sec['guides']) > 1
    for gi, g in enumerate(sec['guides']):
        if many:
            if gi:
                d.rule(before=4 * mm, after=4 * mm)
            d.para(f'Use case {gi + 1}', 'B', 9, NAVY, lead=13, keep=3)
            d.para(g['title'], 'B', 13, TEXT, lead=18, keep=2)
            d.space(2 * mm)
        render_guide(d, g, data)

    # ---- 04 concept ----
    k = S['concept']
    section_opener(d, 4, k['label'], k.get('subtitle'))
    d.box_pad(4 * mm, NAVY)
    rows = k['rows']
    for r in rows[:1]:
        if r.get('label'):
            d.para(r['label'], 'B', 8.5, ICE, lead=13, bg=NAVY)
        d.para(r['value'], 'R', 11, white, lead=17.5, bg=NAVY)
        d.box_pad(3 * mm, NAVY)
    if k.get('list'):
        if k['list'].get('label'):
            d.para(k['list']['label'], 'B', 8.5, ICE, lead=13, bg=NAVY)
        for it in k['list']['items']:
            line = f"{it['term']} — {it['text']}" if it.get('term') else it['text']
            d.para(f'•  {line}', 'R', 10, white, lead=15.5, bg=NAVY)
        d.box_pad(3 * mm, NAVY)
    for r in rows[1:]:
        if r.get('label'):
            d.para(r['label'], 'B', 8.5, ICE, lead=13, bg=NAVY)
        d.para(r['value'], 'R', 10.5, white, lead=16.5, bg=NAVY)
        d.box_pad(3 * mm, NAVY)
    if k['links']:
        d.chunks([(l['text'], l['href']) for l in k['links']], color=white, bg=NAVY, inset_r=4 * mm)
    d.box_pad(3 * mm, NAVY)

    # ---- closing ----
    d.space(6 * mm)
    if issue.get('outro'):
        d.para(issue['outro'], 'R', 12.5, TEXT, lead=19, keep=2)
    d.space(1 * mm)
    d.para(f"הגישו אירוע: {data['formUrl'].rstrip('/')}", 'B', 10, NAVY, lead=15, link=data['formUrl'])
    d.para(f"הציעו use case: {data['shareUrl'].rstrip('/')}", 'B', 10, NAVY, lead=15, link=data['shareUrl'])
    d.draw_footer()
    c.save()


if __name__ == '__main__':
    build(json.load(sys.stdin))
