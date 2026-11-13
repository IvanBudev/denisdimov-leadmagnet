/* ═══════════════════════════════════════════════════════════════
   Лийд магнит (PDF) — A/B страница.
   Вариантът се чете от <body data-variant="A|B">.
   ═══════════════════════════════════════════════════════════════ */

// CRM webhook — ?type=free слага лийда в колона „Лийд от безплатен ресурс" (FREE_RESOURCE).
// Токенът е същият като на уебинар страницата.
var CRM_WEBHOOK_URL =
  'https://crm-denis-dimov.vercel.app/api/webhooks/lead' +
  '?token=cb-secret-denisdimov-hv4e37cislfo05r6tq9j&type=free';

var THANK_YOU_URL = '/magnet/thank-you.html';

var VARIANT = document.body.getAttribute('data-variant') || 'A';

// Източникът включва варианта, за да се сравняват двата в CRM-а.
var LEAD_SOURCE = 'Лийд магнит · Капанът на преследвача'; // фуния · име на ресурса: CRM-ът го познава и го показва като тема

// ?test в адреса пропуска CRM-а (за тестове, лийдът не се записва).
var TEST_MODE = /[?&]test(=|&|$)/.test(location.search);

function vaTrack(name, data) {
  try {
    var d = data || {};
    d.variant = VARIANT;
    if (typeof window.va === 'function') window.va('event', { name: name, data: d });
  } catch (e) { /* тихо */ }
}

/* ─── Отзиви: един наведнъж, със стрелки ──────────────────────────
   Без точки и без брояч, за да не се вижда докъде е стигнал човекът. Върти се в кръг.
   Броят е неограничен:
   • текстови отзиви: добави обект в TEXT_TESTIMONIALS;
   • съобщения (снимки): за msg-01…msg-NN в GH_BASE. TESTIMONIAL_COUNT е началният брой, а след него
     страницата сама проверява msg-(N+1), msg-(N+2)… и добавя всяка, която съществува.
   Снимка, която не се зареди, се пропуска. */
var GH_BASE = 'https://raw.githubusercontent.com/agatev200-hash/denis-social-proof/main/';
var TESTIMONIAL_COUNT = 36;

var TEXT_TESTIMONIALS = [
  { name: 'Стефан', date: '24 септември 2026 г.', rating: 5,
    text: 'Трябва да се действа, веднъж ще те отхвърлят, втори път ще те отхвърлят, трети път ще стане, няма място за страх и притеснение' },
  { name: 'Stanislav Kurtev', date: '24 септември 2026 г.', rating: 5,
    text: 'Полезни и ценни съвети. Супер уебинар беше' }
];

(function () {
  var root = document.getElementById('tt');
  if (!root) return;
  var view = root.querySelector('.tt-viewport');
  var slides = [];
  var idx = 0;

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function initials(n) { return n.trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function show(i) {
    if (!slides.length) return;
    idx = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.el.classList.toggle('is-on', k === idx); });
    // Зареждаме само текущата и съседните снимки (ленив начин, без да теглим всичко).
    [idx - 1, idx, idx + 1].forEach(function (k) {
      var s = slides[(k + slides.length) % slides.length];
      if (s.img && s.img.getAttribute('data-src')) {
        s.img.src = s.img.getAttribute('data-src');
        s.img.removeAttribute('data-src');
      }
    });
  }

  function addText(t) {
    var el = document.createElement('div');
    el.className = 'tt-slide';
    el.innerHTML =
      '<div class="quote"><div class="who"><span class="avatar">' + esc(initials(t.name)) + '</span>' + esc(t.name) + '</div>' +
      '<div class="stars" aria-label="' + t.rating + ' от 5">' + '★★★★★'.slice(0, t.rating) + '</div>' +
      '<p>„' + esc(t.text) + '“</p></div>';
    view.appendChild(el);
    slides.push({ el: el });
  }

  function addImage(src, eager) {
    var el = document.createElement('div');
    el.className = 'tt-slide';
    var img = document.createElement('img');
    img.alt = 'Съобщение от мъж, работил с Денис';
    img.decoding = 'async';
    if (eager) img.src = src; else img.setAttribute('data-src', src);
    el.appendChild(img);
    var slide = { el: el, img: img };
    img.onerror = function () {
      var k = slides.indexOf(slide);
      if (k === -1) return;
      slides.splice(k, 1);
      el.remove();
      show(idx >= slides.length ? 0 : idx);
    };
    view.appendChild(el);
    slides.push(slide);
  }

  TEXT_TESTIMONIALS.forEach(addText);
  for (var i = 1; i <= TESTIMONIAL_COUNT; i++) addImage(GH_BASE + 'messages/msg-' + pad(i) + '.jpg', false);
  show(0);

  // Автоматично добавя следващите msg-NN, ако са качени в репото.
  (function probe(n) {
    var src = GH_BASE + 'messages/msg-' + pad(n) + '.jpg';
    var im = new Image();
    im.onload = function () { addImage(src, true); probe(n + 1); };
    im.src = src;
  })(TESTIMONIAL_COUNT + 1);

  root.querySelector('.tt-prev').addEventListener('click', function () { show(idx - 1); vaTrack('testimonial_next', { dir: 'prev' }); });
  root.querySelector('.tt-next').addEventListener('click', function () { show(idx + 1); vaTrack('testimonial_next', { dir: 'next' }); });

  // Плъзгане с пръст на телефон.
  var x0 = null;
  root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();

// Знаменателят за conversion rate по вариант.
vaTrack('ab_page_view');

/* ─── CTA клик ─── */
document.querySelectorAll('[data-cta]').forEach(function (el) {
  el.addEventListener('click', function () {
    vaTrack('cta_click', { pos: el.getAttribute('data-cta') });
  });
});

/* ─── Формуляри (има по един в hero и във финалния блок) ─── */
document.querySelectorAll('form.lm-form').forEach(function (form) {
  var pos = form.getAttribute('data-pos') || 'form';
  var started = false;

  // Първо докосване на формуляра — показва колко хора започват, но не завършват.
  form.addEventListener('focusin', function () {
    if (started) return;
    started = true;
    vaTrack('form_start', { pos: pos });
  });

  function field(name) { return form.querySelector('[name="' + name + '"]'); }
  function errOf(name) { return form.querySelector('[data-err="' + name + '"]'); }

  function clearErrors() {
    form.querySelectorAll('.err').forEach(function (e) { e.hidden = true; });
    form.querySelectorAll('.invalid').forEach(function (e) { e.classList.remove('invalid'); });
  }
  function fail(name) {
    errOf(name).hidden = false;
    var f = field(name);
    if (f.type !== 'checkbox') f.classList.add('invalid');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var name = field('name').value.trim();
    var email = field('email').value.trim();
    var phone = field('phone').value.trim();
    var consent = field('consent').checked;

    var ok = true;
    if (!name) { fail('name'); ok = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('email'); ok = false; }
    if (!phone || phone.replace(/\D/g, '').length < 6) { fail('phone'); ok = false; }
    if (!consent) { fail('consent'); ok = false; }
    if (!ok) return;

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Изпращане...';

    var payload = JSON.stringify({ name: name, email: email, phone: phone, source: LEAD_SOURCE });

    if (!TEST_MODE) {
      // sendBeacon оцелява при бърза навигация (важно във Facebook in-app браузъра).
      if (navigator.sendBeacon) {
        navigator.sendBeacon(CRM_WEBHOOK_URL, new Blob([payload], { type: 'text/plain' }));
      } else {
        fetch(CRM_WEBHOOK_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: payload, keepalive: true
        }).catch(function () { /* тихо */ });
      }
    }

    if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'Лийд магнит PDF ' + VARIANT });
    vaTrack('lead_submitted', { pos: pos, source: LEAD_SOURCE });

    // Кратко изчакване, за да излетят pixel/analytics заявките преди навигацията.
    setTimeout(function () {
      window.location.href = THANK_YOU_URL + '?v=' + VARIANT + (TEST_MODE ? '&test' : '');
    }, 300);
  });
});
