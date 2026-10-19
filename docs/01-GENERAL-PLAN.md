# מועדון היזמות רייכמן — תוכנית כללית

> מסמך 1 מתוך 2. המסמך השני, [`02-MAILING-SYSTEM-PLAN.md`](./02-MAILING-SYSTEM-PLAN.md), מפרט את מערכת הדיוור.
> עודכן: 18.10.2026
>
> **Scope update:** The newsletter is public pages shared on WhatsApp. There is no subscriber list. Sending is a one-off CSV upload at `/send` (English UI, no database, recipients are not stored). Sections below that describe subscribers, opt-in, or saved campaigns are not the current build.

---

## 1. מטרה

מערכת ניהול אחת למועדון היזמות של אוניברסיטת רייכמן, שתגדל בהדרגה. בשלב הראשון יש שני מוקדים:

1. **מערכת דיוור לקמפיינים ופרסום.** העתקה של מערכת הדיוור של MyNeto (`FinanceManager.nosync`) בלי workflows, בלי templates ובלי crons.
2. **בסיס לניוזלטר.** ארכיון ציבורי של גיליונות, עמוד לכל גיליון, טופס הרשמה עם אישור כפול (double opt-in), ואפשרות לשלוח גיליון כקמפיין.

כל השאר (ניהול חברים, אירועים, CRM לסטארטאפים, מנטורים וכו') נבנה בהמשך על אותו בסיס.

---

## 2. מה כבר נבנה בתיקייה

| רכיב | מצב | קובץ |
|---|---|---|
| Next.js 16.4.2 (App Router, TypeScript, Tailwind v4, ESLint) | ✅ | `package.json` |
| Cache Components + Partial Prefetching (ברירת המחדל של ה-scaffold) | ✅ | `next.config.ts` |
| שפה עברית ו-RTL גלובלי (`lang="he" dir="rtl"`), גופן Heebo | ✅ | `src/app/layout.tsx` |
| Prisma 7 + Neon driver adapter, סכמה מלאה לדיוור ולניוזלטר | ✅ (ללא DB מחובר) | `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/db.ts` |
| אימות משתני סביבה עם zod, `server-only` | ✅ | `src/lib/env.ts` |
| רשימת כתובות שולח מותרות | ✅ (placeholder) | `src/lib/mailing/senders.ts` |
| דף בית, ארכיון ניוזלטר (שלד), `GET /api/health` | ✅ | `src/app/...` |
| `.env.example` עם כל המשתנים | ✅ | `.env.example` |
| `npm run typecheck`, `lint`, `build` עוברים | ✅ | |

**מה עוד לא קיים בכוונה:** אימות משתמשים (auth), חיבור למסד נתונים, חשבון Resend, ממשק אדמין. הכול מתוכנן בשלבים למטה.

**בדיקה קטנה עכשיו:** `npm run dev` ואז לפתוח את `http://localhost:3000` ואת `/newsletter`. הטקסט צריך להיות מיושר לימין, בגופן Heebo.

---

## 3. החלטות טכנולוגיות

| תחום | בחירה | למה |
|---|---|---|
| Framework | Next.js 16.4 App Router | ביקשת. אותה משפחה כמו MyNeto, כך שהקוד הקיים ניתן להעתקה. |
| שפה | TypeScript strict | |
| עיצוב | Tailwind v4 עם תכונות לוגיות (`ps-`/`pe-`/`start-`) | RTL נכון בלי עבודה כפולה. |
| DB | Postgres ב-Neon (דרך Vercel Marketplace) | כמו MyNeto. ענפי DB לכל Preview. |
| ORM | Prisma 7 + `@prisma/adapter-neon` | MyNeto על Prisma 5. גרסה 7 דורשת `prisma.config.ts`, את הגנרטור `prisma-client` עם `output`, ו-driver adapter. כבר מוגדר. |
| דיוור | Resend (`resend@6.34`) | ביקשת. Batch API עד 100 מיילים בקריאה, webhooks חתומים (Svix), idempotency keys. |
| ולידציה | zod 4 | MyNeto מוודא קלט ידנית ברוב הנתיבים. כאן כל קלט עובר דרך סכמת zod. |
| Auth | Auth.js (next-auth) v4 + Google | הוחלט. זהה ל-MyNeto, ראו סעיף 6. |
| Hosting | Vercel (Fluid Compute, Node.js 24) | `after()` רץ עד `maxDuration` (ברירת מחדל 300 שניות). זה מה שמאפשר שליחת קמפיינים **בלי cron**. |
| Rate limiting | Vercel WAF rate-limit rules (בלי קוד), או Upstash Redis | MyNeto משתמש ב-Upstash. לנפח של מועדון, חוקי WAF מספיקים לנתיבים הציבוריים. |

### הערות לגבי Next.js 16 (חשוב לכל מי שכותב קוד כאן)

- **Middleware נקרא עכשיו Proxy.** הקובץ הוא `src/proxy.ts` עם `export function proxy()`. אין להשתמש בו כמנגנון הרשאות יחיד. Proxy נועד לבדיקות "אופטימיות" בלבד, וההרשאה האמיתית נבדקת בכל Server Action ו-Route Handler.
- **Cache Components פעיל.** כל קומפוננטה שקוראת `cookies()`/`headers()`/DB צריכה להיות עטופה ב-`<Suspense>`, אחרת ה-build ייכשל. דפי אדמין יהיו דינמיים, ודפי ניוזלטר יהיו cached עם `revalidateTag` בזמן פרסום.
- **התיעוד שתואם לגרסה נמצא ב-`node_modules/next/dist/docs/`** (ראו `AGENTS.md`). קוראים אותו לפני שכותבים API שלא בטוחים בו.

---

## 4. ארכיטקטורה ומבנה תיקיות

```text
src/
  app/
    (public)/                 # בעתיד: קבוצת נתיבים ציבוריים
    newsletter/               # ארכיון + [slug] + subscribe/confirm
    unsubscribe/              # דף הסרה (GET מציג אישור, POST מבצע)
    admin/                    # כל ממשק הניהול, מוגן בהרשאה
      campaigns/ subscribers/ groups/ newsletter/
    api/
      health/
      webhooks/resend/        # webhook של Resend (חתום)
      unsubscribe/            # RFC 8058 one-click POST
  lib/
    env.ts                    # משתני סביבה (server-only)
    db.ts                     # Prisma client (server-only)
    auth/                     # requireAdmin() וכו'
    mailing/                  # כל הלוגיקה של הדיוור (ראו מסמך 2)
    newsletter/
  components/
    ui/                       # רכיבי בסיס
    admin/                    # רכיבי אדמין
  generated/prisma/           # נוצר ע"י prisma generate (ב-.gitignore)
prisma/
  schema.prisma
  migrations/
docs/
```

### עקרונות

1. **שכבות.** UI ← Server Actions / Route Handlers ← `lib/*` (לוגיקה עסקית) ← Prisma. הלוגיקה לא יושבת בתוך route handlers. ב-MyNeto לוגיקת השליחה מפוזרת בין `send/route.ts` ל-`cron/smart-send/route.ts`, וזה מה שאנחנו נמנעים ממנו.
2. **`import "server-only"`** בכל מודול שנוגע בסודות או ב-DB, כך שייבוא בטעות מקומפוננטת client נכשל כבר ב-build. ב-MyNeto זה מתועד כ-"Common Pitfall #1" ונאכף רק ידנית.
3. **Server Actions לפעולות אדמין** (יצירה, עריכה ושליחה של קמפיין), **Route Handlers** רק לנקודות שמקבלות קריאות מבחוץ (webhook, one-click unsubscribe, health).
4. **switch ממצה** על enums/unions עם בדיקת `never` ב-default.
5. **אין imports בתוך פונקציות.**

---

## 5. מודל נתונים (סקירה)

הסכמה המלאה ב-`prisma/schema.prisma`. ההסבר המפורט על חלק הדיוור נמצא במסמך 2.

| מודל | תפקיד |
|---|---|
| `Subscriber` | נמען. אימייל ייחודי (lowercase), סטטוס (`PENDING`/`ACTIVE`/`UNSUBSCRIBED`/`BOUNCED`/`COMPLAINED`), מקור, ותיעוד הסכמה (`consentAt`, `consentSource`). |
| `Group` / `GroupMember` | קבוצות קהל ידניות (למשל "חברי ועד", "משתתפי האקתון 2026"). |
| `Campaign` | קמפיין: נושא, HTML, שולח, פילטר קהל (JSON), סטטוס ומונים. |
| `CampaignRecipient` | **צילום קהל** בזמן שליחה, שורה לכל נמען, עם סטטוס שליחה ו-`resendEmailId`. |
| `EmailEvent` | אירועי webhook (delivered/opened/clicked/bounced...). `webhookId` ייחודי למניעת כפילויות. |
| `NewsletterIssue` | גיליון ניוזלטר: slug, כותרת, HTML, סטטוס פרסום, וקישור אופציונלי לקמפיין ששלח אותו. |

**ההבדל המהותי מ-MyNeto:** שם הנמענים הם `User` של האפליקציה, ונמענים חיצוניים מ-CSV מקבלים "ID מזויף" (`external-<email>`). כאן `Subscriber` הוא ישות נפרדת ממשתמשי האדמין, וכל נמען, גם מ-CSV, הוא שורה אמיתית עם סטטוס ותיעוד הסכמה. זה מבטל משפחה שלמה של באגים (ראו מסמך 2, סעיף 3).

---

## 6. הרשאות ואדמין

### דרישות

- רק אנשי צוות המועדון נכנסים ל-`/admin`.
- רשימת אדמינים מנוהלת ב-`ADMIN_EMAILS` (כמו ב-MyNeto), ובהמשך אפשר לעבור לטבלת תפקידים.
- כל Server Action ו-Route Handler של אדמין קורא ל-`requireAdmin()` בצד השרת. Proxy משמש רק להפניה מהירה לדף התחברות.

### אפשרויות (צריך להחליט)

| אפשרות | יתרונות | חסרונות |
|---|---|---|
| **Better Auth** + Google OAuth (מומלץ) | ספרייה מודרנית שמנוהלת אצלנו, טבלאות ב-Postgres שלנו, תמיכה בתפקידים ו-magic link | עוד כמה טבלאות בסכמה |
| Auth.js (next-auth) v4 | זהה ל-MyNeto, אפשר להעתיק את `requireAdmin` כמעט כמו שהוא | v4 בתחזוקה בלבד, v5 עדיין beta |
| Clerk (Vercel Marketplace) | אפס קוד אימות, UI מוכן | ספק חיצוני, עלות לפי משתמש, הנתונים אצל צד שלישי |

**✅ הוחלט (18.10.2026): Auth.js (next-auth) v4**, כמו ב-MyNeto. Google OAuth, JWT sessions, ו-allowlist לפי `ADMIN_EMAILS` בתוך `callbacks.signIn`. מעתיקים את `requireAdmin()` מ-`FinanceManager.nosync/src/lib/adminHelpers.ts` ומתאימים אותו. מוסיפים ל-env את `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID` ו-`GOOGLE_CLIENT_SECRET`. כשיגיע הזמן לעבור ל-v5 או ל-Better Auth, הממשק `requireAdmin()` נשאר זהה.

**בדיקה אחרי השלב:** משתמש שלא ברשימה שמנסה להיכנס ל-`/admin` מופנה החוצה, וקריאה ישירה ל-Server Action בלי סשן מחזירה שגיאה.

---

## 7. בסיס הניוזלטר

### נתיבים ציבוריים

| נתיב | תיאור | Caching |
|---|---|---|
| `/newsletter` | ארכיון: רשימת גיליונות שפורסמו (כותרת, תקציר, תאריך, תמונה) | `use cache` + `cacheTag('newsletter')` |
| `/newsletter/[slug]` | גיליון בודד, מוצג מתוך `contentHtml` (מסונן) | `use cache` + `cacheTag('newsletter:'+slug)`, `generateMetadata` ל-OG |
| `/newsletter/subscribe` (Server Action) | טופס: אימייל + שם פרטי + checkbox הסכמה מפורשת | דינמי |
| `/newsletter/confirm?token=` | אישור כפול: מעביר את `Subscriber` ל-`ACTIVE` ורושם `consentAt` | דינמי |
| `/unsubscribe` | הסרה (משותף למערכת הדיוור) | דינמי |

### זרימת הרשמה (Double Opt-In)

1. המשתמש ממלא טופס. השרת מוודא את הקלט עם zod ומפעיל rate-limit לפי IP.
2. נוצר `Subscriber` בסטטוס `PENDING` (כבר קיים בסכמה). אם הנמען קיים, לא משנים לו כלום, כדי לא לחשוף אם האימייל רשום.
3. נשלח מייל אישור עם טוקן HMAC חתום עם תפוגה של 48 שעות.
4. לחיצה על הקישור מציגה דף עם כפתור "אישור". ה-POST מעביר ל-`ACTIVE` ורושם `consentAt` ו-`consentSource`.
5. התגובה תמיד זהה ("אם הכתובת תקינה, שלחנו מייל אישור"), כדי למנוע חשיפת רשימת התפוצה.

**למה double opt-in:** חוק התקשורת, סעיף 30א ("חוק הספאם"), דורש הסכמה מפורשת מראש. אישור כפול גם משפר את ה-deliverability ומונע הרשמת כתובות של אחרים.

### ממשק אדמין לניוזלטר

- `/admin/newsletter`: רשימת גיליונות עם סטטוס.
- `/admin/newsletter/new` ו-`[id]/edit`: עורך (אותו עורך של קמפיינים, ראו מסמך 2), שדות slug/כותרת/תקציר/תמונה.
- כפתור **"פרסם"**: מעביר ל-`PUBLISHED` ומפעיל `revalidateTag('newsletter')`.
- כפתור **"שלח כקמפיין"**: יוצר `Campaign` בסטטוס DRAFT עם אותו HTML, קישור "לצפייה בדפדפן" ל-`/newsletter/[slug]`, וקישור `campaignId` בגיליון.

### תמונות

Vercel Blob (public) להעלאת תמונות שער ותמונות בתוך הגיליון. העלאה ישירה מהדפדפן (client upload), כי גוף בקשה לפונקציה מוגבל ל-4.5MB.

**בדיקה אחרי השלב:** פרסום גיליון מופיע ב-`/newsletter` תוך שניות (revalidate). הרשמה עם אימייל אמיתי מייצרת מייל אישור, ואחרי האישור הנמען ב-`ACTIVE` עם `consentAt`.

---

## 8. אבטחה — קו בסיס

<SECURITY_REVIEW>

| סיכון | הגנה |
|---|---|
| גישה לא מורשית לאדמין | `requireAdmin()` בכל Server Action/Route; Proxy להפניה בלבד; allowlist. |
| XSS דרך תוכן HTML של קמפיין או ניוזלטר | `sanitize-html` עם allowlist מוגדר, **בשמירה וגם בהצגה** בדף הציבורי. אין `dangerouslySetInnerHTML` על תוכן שלא סונן. |
| הרשמת ספאם או enumeration | rate limit לפי IP, תשובה אחידה, double opt-in, honeypot field. אם צריך, Vercel BotID. |
| זיוף webhook | אימות חתימת Svix **לפני** כל עיבוד, דחיית timestamp ישן, idempotency לפי `svix-id` ב-DB. |
| הסרות זדוניות | טוקן HMAC חתום עם תפוגה לכל נמען, `timingSafeEqual`, וסוד ייעודי (`UNSUBSCRIBE_SECRET`), לא סוד ה-auth. |
| דליפת סודות | `server-only`, אף משתנה סודי לא מתחיל ב-`NEXT_PUBLIC_`, סודות רק ב-Vercel env, `.env*` ב-gitignore. |
| CSRF | Server Actions מגיעים עם הגנת Origin מובנית ב-Next.js. Route Handlers שמשנים מצב מקבלים רק חתימה או טוקן. |
| Headers | CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` ב-`next.config.ts` (שלב 1). |
| פרטיות (תיקון 13 לחוק הגנת הפרטיות) | איסוף מינימלי (אימייל ושם פרטי), מדיניות פרטיות, מחיקת נמען לפי בקשה (מחיקה קשה ולא רק סטטוס), לוג פעולות אדמין. |

</SECURITY_REVIEW>

---

## 9. תפעול (Operations)

### סביבות

| סביבה | Vercel | DB | Resend |
|---|---|---|---|
| Development | `npm run dev` | ענף Neon `dev` | API key נפרד; שולחים רק ל-`delivered@resend.dev` או לכתובות צוות |
| Preview | כל PR | ענף Neon אוטומטי לכל Preview (אינטגרציית Neon) | API key של בדיקות, **בלי שליחה לרשימות אמיתיות** |
| Production | `main` | ענף `main` | API key של production עם הרשאת `sending_access` בלבד |

### מיגרציות

- פיתוח: `npm run db:migrate` (יוצר קובץ ב-`prisma/migrations`, נכנס ל-git).
- פרודקשן: `npm run db:deploy` כחלק מה-build ב-Vercel, או כשלב ב-CI לפני promote. **לא** משתמשים ב-`db push` על פרודקשן, כמו שעושים ב-MyNeto.

### ניטור

- Vercel Logs + Observability לשגיאות ולזמני ריצה של הפונקציות.
- לוגים מובנים עם prefix (`[mailing]`, `[webhook]`), בלי PII מלא בלוג (מסתירים את האימייל).
- דשבורד Resend לבעיות deliverability. התראה ידנית אם bounce rate עולה על 4% או complaint rate על 0.08%, שהם הספים שבהם Gmail ו-Yahoo מתחילים לחסום.
- Health check: `GET /api/health`.

### דומיין ו-DNS (חובה לפני שליחה אמיתית)

- תת-דומיין ייעודי לשליחה, למשל `mail.<domain>`, כדי שבעיית מוניטין בדיוור לא תפגע במיילים האישיים של הדומיין הראשי.
- רשומות SPF, DKIM ו-MX שמוגדרות ב-Resend, ומדיניות **DMARC** (`p=none` בהתחלה, ואחר כך `quarantine`). Gmail ו-Yahoo דורשים DMARC לשולחים בכמויות.
- Open/click tracking מופעל **רק** על תת-הדומיין של הקמפיינים.

### גיבוי

Neon Point-in-Time Restore (לפי התוכנית). לפני מיגרציה הרסנית יוצרים ענף גיבוי ידני.

---

## 10. ציות לחוק (ישראל)

> לא ייעוץ משפטי. מומלץ לעבור על זה עם מי שמטפל בעניינים משפטיים באוניברסיטה.

חוק התקשורת (בזק ושידורים), סעיף 30א, חל על "דבר פרסומת":

1. **הסכמה מפורשת מראש** בכתב. אצלנו זה checkbox לא מסומן מראש ו-double opt-in, עם `consentAt`/`consentSource`.
2. **סימון "פרסומת"** בתחילת שורת הנושא, כשמדובר בדבר פרסומת. כדאי להוסיף בעורך הקמפיין מתג "זהו דבר פרסומת" שמוסיף את הקידומת אוטומטית. ב-MyNeto אין מנגנון כזה.
3. **זיהוי השולח** (שם ודרכי יצירת קשר) בגוף ההודעה. מוסיפים footer קבוע בכל קמפיין.
4. **אפשרות סירוב פשוטה** בכל הודעה: קישור הסרה וכותרות `List-Unsubscribe`.

---

## 11. מפת דרכים בשלבים

כל שלב קטן, ובסופו בדיקה קצרה שמוודאת שאנחנו בכיוון.

| שלב | תוכן | בדיקה בסוף השלב |
|---|---|---|
| **0 — בסיס** ✅ | Next.js, RTL, Prisma schema, env, מבנה תיקיות, תוכניות | `npm run build` עובר; `/` ו-`/newsletter` נטענים ב-RTL |
| **1 — תשתית** | יצירת פרויקט Vercel; Neon דרך Marketplace; `vercel env pull`; מיגרציה ראשונה; security headers; repo ב-GitHub | `npm run db:migrate` יוצר טבלאות; `prisma studio` מציג אותן |
| **2 — Auth** | ספריית auth לפי ההחלטה, `requireAdmin()`, `src/proxy.ts`, layout של `/admin` | משתמש שלא ברשימה נחסם; משתמש שברשימה רואה את הדשבורד |
| **3 — Resend** | פתיחת חשבון; אימות תת-דומיין; API key; webhook endpoint | `sendTestEmail` מגיע לתיבה; ה-webhook מקבל `email.delivered` |
| **4 — נמענים וקבוצות** | CRUD לנמענים, ייבוא CSV, קבוצות | ייבוא CSV של 50 כתובות; כפילויות מסוננות; חיפוש עובד |
| **5 — קמפיינים** | עורך, תצוגה מקדימה, מייל בדיקה, שליחה, webhook, הסרה, דוח | קמפיין ל-5 כתובות צוות: כולם מקבלים, הדוח מציג delivered/opened, ההסרה עובדת |
| **6 — ניוזלטר** | ארכיון, עמוד גיליון, אדמין, double opt-in, "שלח כקמפיין" | פרסום מופיע מיד; הרשמה עם אישור עובדת מקצה לקצה |
| **7 — הקשחה** | rate limits (WAF), בדיקות vitest ללוגיקת דיוור, Playwright smoke | `npm test` ירוק; ניסיון webhook מזויף נדחה |

---

## 12. החלטות פתוחות

1. ~~ספריית Auth~~: הוחלט, Auth.js v4.
2. **דומיין שליחה:** איזה דומיין שייך למועדון? צריך גישה ל-DNS שלו.
3. **חשבון Vercel ו-Neon:** תחת איזה team? מי מנהל billing?
4. **תוכנית Resend:** התוכנית החינמית מוגבלת מאוד בנפח יומי וחודשי (בדקו את המספרים העדכניים בדף התמחור). לפי גודל הרשימה הצפוי צריך לבחור תוכנית.
5. **שם הפרויקט/מותג:** `ruec-club` הוא שם זמני ב-`package.json`.
