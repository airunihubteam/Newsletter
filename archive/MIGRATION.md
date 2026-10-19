# מיגרציה: ניוזלטר מדור החדשנות וה-AI

תאריך: 19 באוקטובר 2026.

ארכיון הגיליונות של מדור החדשנות וה-AI הוא עכשיו עמוד הבית של ruecai.com, בתוך אפליקציית Next.js של המועדון. כל גיליון נפתח משם. המחולל הסטטי שנבנה בנפרד הועבר לתיקייה הזו ואינו רץ באתר.

## מאיפה זה הגיע

איתי (`itayarish`) בנה מחולל אתר סטטי שהופך קובץ Markdown ל-HTML, לכרטיס וואטסאפ ול-PDF. העבודה נכנסה ל-`main` ב-19 באוקטובר 2026:

- `bfa0e03` — Add the AI newsletter
- `eafe9d1` — Add .gitignore for the AI newsletter folder
- `e16ad32` — Merge pull request #1 from `airunihubteam/add-ai-newsletter`

המחולל פורסם כפרויקט Vercel נפרד (`ruec-ai-newsletter`). האתר הציבורי של המועדון הוא פרויקט Next.js אחד. שני אתרים על שני סטאקים היו משאירים את הגיליון מחוץ ל-ruecai.com, אז העמוד נבנה מחדש כאן והמחולל הוקפא.

## מה רץ היום באתר

| מה | איפה |
|---|---|
| ארכיון גיליונות, עמוד הבית | `/` |
| כתובת ישנה של הארכיון | `/newsletter` מפנה אל `/` |
| גיליון לפי slug, למשל `issue-1` | `/newsletter/issue-1` |
| קבצי הגיליון | `content/newsletter/issues/*.md` |
| תבנית לגיליון הבא | `content/newsletter/TEMPLATE.md` |
| לוגו, בוטי, תמונת בניין, סרטונים | `public/newsletter/` |
| פענוח ה-Markdown | `src/lib/newsletter/` |
| העמוד | `src/components/newsletter/` |

העמוד כולל את ארבעת החלקים (חדשות, אירועים, Use Cases, מושג בקטנה), העתקת פרומפט, נגן וידאו, פס התקדמות קריאה, וסימון אירוע שעבר לפי התאריך אצל הקורא. שיתוף וואטסאפ נשאר.

## מה נשאר רק בארכיון

התיקייה `archive/ai-newsletter/` היא עותק קפוא. היא לא חלק מבילד ה-Next ולא מתפרסמת.

| נדחה | למה |
|---|---|
| טפסים `/submit-event/` ו-`/share/`, ו-Google Sheet | לא חוברו לסטאק. הכפתורים "הגישו אירוע", "הציעו use case", "לטופס ההגשה" הוסרו מהעמוד כדי שלא יובילו לעמוד חסר |
| PDF (`scripts/pdf.py`) | דורש Python ו-reportlab, ולא רץ על שרת ה-Next |
| כרטיס OG ‏1200×630 (`scripts/og.js`) | דורש Chrome. בינתיים תמונת הבניין משמשת כ-`og:image` |
| אנליטיקס (PostHog ב-README, Google Analytics בקוד) | לא הועבר. אין באנר הסכמה |
| `npm run check` וכללי `EDITORIAL.md` | נשארים מסמך עריכה. האתר לא חוסם פרסום לפיהם |
| `npm run deploy` בתיקייה הזו | מפרסם לפרויקט Vercel אחר, לא ל-ruecai.com |

## איפה עורכים

עורכים רק את העותק החי:

- טקסט הגיליון: `content/newsletter/issues/`
- מדיה שמופיעה בגיליון: `public/newsletter/media/`
- נכסי מותג של העמוד: `public/newsletter/`

העותק שבתוך `archive/ai-newsletter/content/` לא משפיע על האתר. שינוי שם לא יופיע ב-ruecai.com.

אין להריץ `npm run deploy` מתוך `archive/ai-newsletter/`. הסקריפט בונה את `dist/` ומעלה אותו לפרויקט `ruec-ai-newsletter`, לא לאתר הזה.

## גיליון הבא

1. מעתיקים את `content/newsletter/TEMPLATE.md` אל `content/newsletter/issues/YYYY-MM-DD.md`.
2. ממלאים frontmatter: `issue` (המספר הבא), `date`, `title`, `description`. `slug` הוא `issue-<number>` אם לא כותבים אחרת.
3. שומרים על ארבעת החלקים: חדשות, כנסים ואירועים, Use Cases, מושג בקטנה. המבנה מתואר ב-`archive/ai-newsletter/README.md` וב-`EDITORIAL.md`.
4. סרטון מקומי: שמים `mp4` ופוסטר `jpg` באותו שם תחת `public/newsletter/media/`, ובגיליון כותבים `(media/שם-הקובץ.mp4)`.
5. הגיליון החדש מופיע בראש עמוד הבית. הכתובת שלו היא `/newsletter/<slug>`, וגיליונות קודמים נשארים באותו נתיב.

כללי המקורות, האירועים והשפה שב-`archive/ai-newsletter/EDITORIAL.md` עדיין מתארים איך הגיליון אמור להיראות. הם לא נאכפים אוטומטית באתר.
