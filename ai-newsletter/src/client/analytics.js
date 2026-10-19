// Google Analytics 4 with Consent Mode v2.
// Nothing is stored on the reader's device until they tap "מאשר/ת" in the consent bar;
// before that, analytics_storage stays "denied" (GA receives only cookieless pings).
// Config comes from window.NL (measurement ID injected at build time from GA_MEASUREMENT_ID).
// Without an ID, events are logged to the console instead (local dev).
//
// Events (all carry issue_number and the UTM parameters GA reads from the URL):
//   issue_view     issue page loaded
//   section_view   a section covers ≥50% of the viewport (or ≥50% of itself if shorter), once per section
//   section_time   seconds a section held the middle of the screen, sent when it leaves (or the tab hides)
//   link_click     outbound link: section, item, link_url
//   cta_click      submit-event / use-case buttons, PDF download, WhatsApp share
//   prompt_copy    copy button on a prompt
//   video_play     video started
//   scroll_depth   25 / 50 / 75 / 100 (% of page), once each
//   form_view / form_submit   reader form opened / sent (form name only, never the answers)
(function () {
  var cfg = window.NL || {};
  var isIssue = !!cfg.issue;
  var CONSENT_KEY = 'nl-analytics-consent';

  // ---------- consent ----------
  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function saveConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
  }

  // ---------- transport ----------
  var gaOn = !!cfg.gaId;
  if (gaOn) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    var stored = readConsent();
    gtag('consent', 'default', {
      analytics_storage: stored === 'granted' ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    });
    gtag('js', new Date());
    gtag('config', cfg.gaId, {
      issue_number: cfg.issue || undefined,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.gaId);
    document.head.appendChild(s);
    if (!stored) showConsentBar();
  }

  function showConsentBar() {
    var bar = document.createElement('div');
    bar.className = 'consent-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'הסכמה לעוגיות');
    bar.innerHTML =
      '<p>אנחנו משתמשים ב-Google Analytics כדי להבין מה מעניין את הקוראים. בלי פרסום ובלי מכירת מידע.</p>' +
      '<div class="consent-actions"><button type="button" data-consent="granted" class="consent-yes">מאשר/ת</button>' +
      '<button type="button" data-consent="denied" class="consent-no">לא, תודה</button></div>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var v = b.dataset.consent;
      saveConsent(v);
      gtag('consent', 'update', { analytics_storage: v });
      bar.remove();
    });
    (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); }))
      .then(function () { document.body.appendChild(bar); });
  }

  // GA4 limits: 100 characters per parameter value.
  function clean(props) {
    var out = {};
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === '') return;
      out[k] = typeof v === 'string' ? v.slice(0, 100) : v;
    });
    if (cfg.issue) out.issue_number = cfg.issue;
    return out;
  }
  function track(name, props) {
    if (gaOn) gtag('event', name, clean(props));
    else if (window.console) console.log('[nl]', name, JSON.stringify(clean(props)));
  }

  if (isIssue) {
    track('issue_view', {
      referrer: document.referrer || null,
      in_app_browser: /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(navigator.userAgent) ? 'yes' : 'no',
    });
  }

  // ---------- clicks ----------
  function onClick(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.dataset.cta) {
      track('cta_click', { cta: a.dataset.cta, location: a.dataset.ctaLocation || null });
      return;
    }
    if (a.dataset.section && /^https?:/.test(a.getAttribute('href'))) {
      track('link_click', {
        section: a.dataset.section,
        item: a.dataset.item || null,
        link_url: a.href,
        link_text: a.textContent.replace(/[←→]/g, '').trim(),
        link_domain: a.hostname.replace(/^www\./, ''),
      });
    }
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', function (e) { if (e.button === 1) onClick(e); }, true);

  document.addEventListener('nl:copy', function (e) {
    track('prompt_copy', { section: e.detail.section, item: e.detail.item });
  });
  document.addEventListener('nl:video', function (e) {
    track('video_play', { section: 'guide', item: e.detail.item, video_provider: e.detail.provider });
  });
  document.addEventListener('nl:form', function (e) {
    var d = e.detail;
    track(d.event, d.ok === undefined ? { form: d.form } : { form: d.form, ok: d.ok ? 'yes' : 'no' });
  });

  if (!isIssue || !('IntersectionObserver' in window)) return;

  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-track-section]'));
  var order = sections.map(function (s) { return s.dataset.trackSection; });
  var t0 = performance.now();

  // ---------- section_view (≥50% of viewport) ----------
  var seen = {};
  var thresholds = [];
  for (var i = 0; i <= 20; i++) thresholds.push(i / 20);
  var viewIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var key = en.target.dataset.trackSection;
      if (seen[key] || !en.isIntersecting) return;
      var need = 0.5 * Math.min(window.innerHeight, en.boundingClientRect.height);
      if (en.intersectionRect.height >= need) {
        seen[key] = true;
        track('section_view', { section: key, section_index: order.indexOf(key) + 1 });
      }
    });
  }, { threshold: thresholds });
  sections.forEach(function (s) { viewIO.observe(s); });

  // ---------- section_time (holds the middle of the viewport) ----------
  var active = null;
  function start(key) { active = { key: key, since: performance.now() }; }
  function stop() {
    if (!active) return;
    var seconds = Math.round((performance.now() - active.since) / 1000);
    if (seconds >= 1) track('section_time', { section: active.key, section_index: order.indexOf(active.key) + 1, seconds: seconds });
    active = null;
  }
  var timeIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var key = en.target.dataset.trackSection;
      if (en.isIntersecting) {
        if (active && active.key !== key) stop();
        if (!active && document.visibilityState === 'visible') start(key);
      } else if (active && active.key === key) {
        stop();
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  sections.forEach(function (s) { timeIO.observe(s); });

  var lastKey = null;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      lastKey = active && active.key;
      stop();
    } else if (lastKey) {
      start(lastKey);
      lastKey = null;
    }
  });
  addEventListener('pagehide', stop);

  // ---------- scroll_depth ----------
  var marks = [25, 50, 75, 100];
  var sent = {};
  var pending = false;
  function depth() {
    pending = false;
    var pct = ((scrollY + innerHeight) / document.documentElement.scrollHeight) * 100;
    marks.forEach(function (m) {
      if (!sent[m] && pct >= (m === 100 ? 98 : m)) {
        sent[m] = true;
        track('scroll_depth', { percent: m });
      }
    });
  }
  addEventListener('scroll', function () { if (!pending) { pending = true; requestAnimationFrame(depth); } }, { passive: true });
  depth();
})();
