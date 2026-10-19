// Page behaviour: copy buttons, video slots, reading progress, past events.
// Emits DOM CustomEvents ("nl:copy", "nl:video") that analytics.js listens to,
// so the UI never depends on PostHog being loaded.
(function () {
  var emit = function (name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); };

  // --- copy prompt ---
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var box = btn.closest('[data-prompt]');
    var text = box.querySelector('.prompt-text').textContent;
    var done = function () {
      btn.textContent = 'הועתק';
      btn.classList.add('is-done');
      setTimeout(function () { btn.textContent = 'העתקה'; btn.classList.remove('is-done'); }, 1800);
      emit('nl:copy', { item: box.dataset.item, section: box.closest('[data-track-section]').dataset.trackSection, length: text.length });
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      ta.remove();
    }
  });

  // --- video: YouTube click-to-load keeps the page fast ---
  document.querySelectorAll('[data-video="youtube"] .video-play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var slot = btn.closest('.video-slot');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + slot.dataset.videoId + '?autoplay=1&rel=0&playsinline=1';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.title = slot.dataset.item;
      btn.replaceWith(f);
      emit('nl:video', { item: slot.dataset.item, provider: 'youtube', id: slot.dataset.videoId });
    });
  });
  document.querySelectorAll('[data-video="file"] video').forEach(function (v) {
    v.addEventListener('play', function () {
      emit('nl:video', { item: v.closest('.video-slot').dataset.item, provider: 'file', id: v.currentSrc });
    }, { once: true });
  });

  // --- events that already happened (page may be read days later) ---
  var today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('.tl-group[data-end]').forEach(function (g) {
    if (g.dataset.end && g.dataset.end < today) g.classList.add('is-past');
  });

  // --- reading progress bar ---
  var bar = document.querySelector('.progress span');
  if (bar) {
    var tick = false;
    var update = function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 1) + ')';
      tick = false;
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
})();
