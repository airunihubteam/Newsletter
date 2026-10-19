# Newsletter project — instructions for Claude

Weekly Hebrew newsletter of the Innovation & AI department, Reichman University Entrepreneurship Club.

- **Editorial rules live in `EDITORIAL.md`.** Follow them for every issue without being reminded. Key ones:
  - News links: ONLY well-known Israeli outlets or the official site of the company in the item. Never Bloomberg, TechCrunch or aggregators. Link text says "לפרטים נוספים…" / "ראו עוד…".
  - Event links: ONLY the event's official site or Luma. If no official link is found, leave the event out and tell the user which ones were dropped.
  - Never list events of other universities (we are Reichman University), including commercial conferences on another university's campus, unless the user explicitly approves.
  - Verify every link and fact by actually opening the page. Check that event dates are in the future (a 2025 page is not a 2026 event). Price (חינם/בתשלום) only if the official page states it.
- New issue: `npm run new` → fill `content/issues/YYYY-MM-DD.md` (format: `content/TEMPLATE.md`) → `npm run check` must pass → `npm run build`.
- Design tokens come from ruec.co.il (`design-tokens.md`). Keep one accent color (#0F2D96), square buttons, and no emojis.
