# Design tokens — extracted from ruec.co.il

Source: live computed styles and Elementor global kit variables on
https://ruec.co.il/ and https://ruec.co.il/ai/ (read 2026-10-17).
The newsletter CSS (`src/styles.css`) mirrors these as `--ru-*` custom properties.

## Colors

| Token | Hex | Where it comes from | Use in the newsletter |
|---|---|---|---|
| `--ru-primary` | `#0F2D96` | `--e-global-color-primary`; headings (H2/H4), solid buttons, nav bar | The single accent: masthead, section numbers, links, CTA |
| `--ru-primary-700` | `#2A44A0` | section background on home page | Hover state of primary |
| `--ru-secondary` | `#46A0D8` | `--e-global-color-secondary`; small highlight blocks | Thin rules, timeline dots, focus ring (used sparingly) |
| `--ru-text` | `#272727` | `--e-global-color-text` | Body text |
| `--ru-text-muted` | `#69727D` | Elementor muted text | Meta lines, dates |
| `--ru-bg` | `#FAFAFA` | page/section background | Page background |
| `--ru-surface` | `#FFFFFF` | content blocks | Section surfaces |
| `--ru-night` | `#000223` | AI-department banner (sampled from header image) | AI masthead band, OG image background |
| `--ru-night-glow` | `#006482` | right-hand glow of the AI banner | Subtle glow in OG image / masthead |

Not brand colors: `#CC3366` (theme default link pink, only on skip-links/images) and the
WordPress preset palette (`--wp--preset--*`) — ignored.

## Typography

- **Family:** `Noto Sans Hebrew` everywhere (`--e-global-typography-primary-font-family`).
  Google web font → used directly; `Assistant` is loaded by the site as a fallback.
- **Weights:** 200 (hero display — "ברוכים הבאים" is 62px / 200), 400 body, 500 section
  titles (H1 40px/500 on /ai/), 600 primary, 700 small headings (H2 26px/700, H4 20px/700).
- **Character:** big, *light* display type for the hero; bold, small, primary-blue for
  labels. The newsletter copies this contrast: issue title in 200–300, section labels in 700.
- **Line-height:** headings tight (~0.9–1.0 on site; we use 1.15 for Hebrew legibility),
  body 1.7.

## Buttons

- **Square corners** (`border-radius: 0`) — no pills, no rounded cards.
- Primary: solid `#0F2D96`, white text, weight 700, 14px, padding ~8px 20px.
- On dark imagery: transparent with `1px solid #FFF`, white text, weight 400.
- Text link-button: primary color, weight 600, underline offset via bottom padding 5px.

## Spacing & layout

- Sections are padded `120px 20px` on desktop; content width 800px (`--wp--style--global--content-size`).
- Block gap 24px. Newsletter: 16px mobile gutter, 680px reading column, 64–96px between sections.

## Logo usage

- Tree-of-stars mark (`assets/logo.png`, 113×142, navy on transparent) with the wordmark
  "מועדון היזמות / אוניברסיטת רייכמן" set to its left (RTL: mark on the right).
- On dark backgrounds the site uses a white version of the mark; we derive it with a CSS
  `filter: brightness(0) invert(1)` instead of shipping a second file.
- The AI department lockup on /ai/ adds a second line: "מדור החדשנות וה-AI".

## Imagery tone

- Home: photography of the campus under a heavy **navy duotone overlay**.
- AI page: deep-night navy banner with a faint **dot-matrix / digital-rain** texture and
  a cyan-teal glow; the mascot is a glossy white 3D robot with a black visor and
  **cyan (#5FF0F0-ish) eyes** — that's Bootie. Friendly, clean, not cyberpunk.
- No purple, no gradients-as-decoration beyond the night→teal glow in the banner.

## Voice

Direct, friendly Hebrew; short headings; plural address ("לחצו כאן", "עקבו אחרינו").
