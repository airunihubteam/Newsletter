// Reader forms (/submit-event/, /share/): validate, POST to /api/submit, show the thank-you.
// Analytics gets only form_view / form_submit with the form name — never the answers.
(function () {
  var form = document.querySelector('form.nl-form');
  if (!form) return;
  var key = form.dataset.form;
  var emit = function (name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail })); };
  emit('nl:form', { event: 'form_view', form: key });

  var err = form.querySelector('.form-error');
  var btn = form.querySelector('button[type=submit]');

  function fail(msg, el) {
    err.textContent = msg;
    err.hidden = false;
    if (el) el.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    // Native validity first (required, url, date), with Hebrew messages.
    var bad = Array.prototype.find.call(form.elements, function (el) { return el.willValidate && !el.checkValidity(); });
    if (bad) {
      var box = bad.closest('.field, fieldset');
      var label = box && box.querySelector('label, legend');
      var name = label ? label.textContent.replace('*', '').trim() : 'שדה';
      return fail(bad.type === 'url' && bad.value ? 'הקישור צריך להתחיל ב-https://' : 'חסר: ' + name, bad);
    }
    var data = { form: key, page: location.pathname, sent_at: new Date().toISOString() };
    new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });

    btn.disabled = true;
    btn.textContent = 'שולחים…';
    fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); }); })
      .then(function () {
        emit('nl:form', { event: 'form_submit', form: key, ok: true });
        form.hidden = true;
        var done = document.querySelector('.form-done');
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        done.focus();
      })
      .catch(function () {
        emit('nl:form', { event: 'form_submit', form: key, ok: false });
        btn.disabled = false;
        btn.innerHTML = 'לנסות שוב <span aria-hidden="true">←</span>';
        fail('משהו לא עבד בשליחה. נסו שוב בעוד רגע.');
      });
  });
})();
