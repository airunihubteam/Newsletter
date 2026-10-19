// The two reader forms: /submit-event/ and /share/.
// Option values are English (they land in the team's English Google Sheet); labels are Hebrew.
// Submissions POST to /api/submit (api/submit.js, a Vercel function), which
// forwards them to a Google Sheet (see README → "Forms").
import { esc, page } from './render.js';

export const FORMS = {
  event: {
    slug: 'submit-event',
    title: 'הגישו אירוע',
    lead: 'מכירים כנס, מיטאפ או האקתון בתחום ה-AI שכדאי שהקהילה תדע עליו? ספרו לנו, ואם הוא מתאים הוא ייכנס לגיליון הקרוב.',
    note: 'אנחנו מפרסמים רק אירועים עם עמוד רשמי או עמוד Luma, ולא מפרסמים אירועים של אוניברסיטאות אחרות.',
    submit: 'שליחת האירוע',
    done: 'תודה! קיבלנו את האירוע ונבדוק אותו לפני הגיליון הבא.',
    fields: [
      { name: 'event_name', label: 'שם האירוע', type: 'text', required: true },
      { name: 'event_date', label: 'תאריך', type: 'date', required: true, half: true },
      { name: 'event_time', label: 'שעה', type: 'time', half: true },
      { name: 'location', label: 'מקום', type: 'text', required: true, placeholder: 'למשל: Wix, יוניצמן 5, תל אביב' },
      { name: 'link', label: 'קישור לעמוד הרשמי או ל-Luma', type: 'url', required: true, placeholder: 'https://', dir: 'ltr', hint: 'לא קישורים לאתרי ריכוז אירועים.' },
      { name: 'price', label: 'מחיר', type: 'radio', options: [['חינם', 'Free'], ['בתשלום', 'Paid'], ['לא ידוע', 'Unknown']] },
      { name: 'audience', label: 'למי זה מתאים?', type: 'textarea', rows: 2 },
      { name: 'submitter_name', label: 'השם שלכם', type: 'text', half: true, autocomplete: 'name' },
      { name: 'contact', label: 'מייל או טלפון לחזרה', type: 'text', half: true, hint: 'לא חובה. רק אם נצטרך לשאול משהו.' },
    ],
  },
  share: {
    slug: 'share',
    title: 'שתפו אותנו',
    lead: 'פתרתם משהו עם AI? מצאתם כלי שחסך לכם שעות? יש לכם רעיון למדריך? ספרו לנו. הרעיונות הכי טובים יהפכו למדריך בגיליון.',
    submit: 'שליחה',
    done: 'תודה ששיתפתם! אנחנו קוראים הכל, ואם נכתוב על זה ניצור אתכם קשר קודם.',
    fields: [
      { name: 'kind', label: 'על מה מדובר?', type: 'radio', required: true, options: [['use case שפתרתי עם AI', 'Use case'], ['כלי שכדאי להכיר', 'Tool'], ['רעיון למדריך', 'Guide idea'], ['משוב על הניוזלטר', 'Feedback']] },
      { name: 'title', label: 'במשפט אחד', type: 'text', required: true, placeholder: 'למשל: בוט שמסכם לי את ההרצאות' },
      { name: 'details', label: 'ספרו לנו עוד', type: 'textarea', rows: 5, required: true, hint: 'מה הבעיה, באיזה כלי השתמשתם ואיך זה עובד.' },
      { name: 'link', label: 'קישור (לא חובה)', type: 'url', placeholder: 'https://', dir: 'ltr' },
      { name: 'submitter_name', label: 'השם שלכם', type: 'text', half: true, autocomplete: 'name' },
      { name: 'contact', label: 'מייל או טלפון לחזרה', type: 'text', half: true },
      { name: 'consent', label: 'אפשר לפרסם את זה בניוזלטר עם השם שלי', type: 'checkbox' },
    ],
  },
};

function field(f, formKey) {
  const id = `${formKey}-${f.name}`;
  const req = f.required ? ' required' : '';
  const star = f.required ? '<span class="req" aria-hidden="true">*</span>' : '';
  const hint = f.hint ? `<span class="hint" id="${id}-hint">${esc(f.hint)}</span>` : '';
  const desc = f.hint ? ` aria-describedby="${id}-hint"` : '';
  const attrs = [
    f.placeholder && `placeholder="${esc(f.placeholder)}"`,
    f.dir && `dir="${f.dir}"`,
    f.autocomplete && `autocomplete="${f.autocomplete}"`,
  ].filter(Boolean).join(' ');
  const cls = `field${f.half ? ' is-half' : ''}`;
  if (f.type === 'radio') {
    return `<fieldset class="${cls} choices"><legend>${esc(f.label)}${star}</legend>
      ${f.options.map(([label, value], i) => `<label class="choice"><input type="radio" name="${f.name}" value="${esc(value)}"${i === 0 ? req : ''}><span>${esc(label)}</span></label>`).join('')}
    </fieldset>`;
  }
  if (f.type === 'checkbox') {
    return `<label class="${cls} check"><input type="checkbox" name="${f.name}" value="yes"><span>${esc(f.label)}</span></label>`;
  }
  const control = f.type === 'textarea'
    ? `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}"${req}${desc} ${attrs}></textarea>`
    : `<input id="${id}" name="${f.name}" type="${f.type}"${req}${desc} ${attrs}>`;
  return `<div class="${cls}"><label for="${id}">${esc(f.label)}${star}</label>${control}${hint}</div>`;
}

export function renderForm(key, { site, assetBase, css, js, analytics, latest, bodyLockup }) {
  const f = FORMS[key];
  const body = `
<header class="masthead has-photo is-form">
  <div class="mast-inner">
    ${bodyLockup}
    <h1 class="mast-title">${esc(f.title)}</h1>
    <p class="mast-desc">${esc(f.lead)}</p>
  </div>
</header>
<main class="page form-page">
  <div class="form-card">
    <div class="form-intro">
      ${f.note ? `<p class="form-note">${esc(f.note)}</p>` : '<p class="form-note">כל הצעה נקראת על ידי צוות המדור.</p>'}
      <img class="form-bootie" src="${assetBase}/bootie-megaphone.webp" alt="" width="96" height="96" decoding="async">
    </div>
    <form class="nl-form" data-form="${key}" novalidate>
      ${f.fields.map((x) => field(x, key)).join('')}
      <div class="hp" aria-hidden="true"><label>אל תמלאו את השדה הזה <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <p class="form-error" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary">${esc(f.submit)} <span aria-hidden="true">←</span></button>
    </form>
    <div class="form-done" hidden role="status">
      <p>${esc(f.done)}</p>
      ${latest ? `<a class="text-cta" href="/${latest.slug}/">חזרה לגיליון #${latest.number} ←</a>` : ''}
    </div>
  </div>
  <p class="form-privacy">הפרטים נשמרים אצל צוות המדור בלבד ומשמשים רק לניוזלטר.</p>
</main>
<footer class="footer">${bodyLockup.replace(' is-dark', '')}
  <nav class="footer-nav"><a href="/">כל הגיליונות</a>${latest ? `<a href="/${latest.slug}/">הגיליון האחרון</a>` : ''}</nav>
</footer>`;
  return page({
    title: `${f.title} · ניוזלטר מדור החדשנות וה-AI`,
    description: f.lead,
    url: `${site}/${f.slug}/`,
    image: latest ? `${site}/${latest.slug}/og.jpg` : '',
    css,
    body,
    js,
    analytics: { ...analytics, page: `form_${key}`, form: key },
    bodyClass: 'form-body',
  });
}
