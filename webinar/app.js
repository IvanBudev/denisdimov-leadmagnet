/* ═══════════════════════════════════════════════════════════════
   Уебинар — landing страница
   Конфигурацията се сменя тук най-отгоре.
   ═══════════════════════════════════════════════════════════════ */

// CRM webhook — създава SetterLead в колона „Лийдове от уебинар" (stage=WEBINAR_LEAD).
// ?type=webinar казва на webhook-а в коя колона да сложи лийда.
var CRM_WEBHOOK_URL =
  'https://crm-denis-dimov.vercel.app/api/webhooks/lead' +
  '?token=cb-secret-denisdimov-hv4e37cislfo05r6tq9j&type=webinar';

// Къде отива човекът след успешна регистрация.
var THANK_YOU_URL = '/webinar/thank-you.html';

// A/B тест на дължината на фунията: късата версия (Б) няма секция "Резултати"
// (#proof) — social proof, FAQ и "За кого е" ги няма там. Пълната версия (А)
// я има. Разчитаме на DOM маркер, не на URL пътя, защото Routing Middleware
// (middleware.js в корена на repo-то) прави сървърен rewrite на /webinar/ към
// произволно A или B съдържание — браузърът винаги вижда /webinar/ в адреса,
// така че проверка по window.location.pathname вече винаги би върнала "A".
var AB_VARIANT = document.getElementById('proof') ? 'A' : 'B';

// Източник, записан на лийда в CRM-а — включва варианта, за да могат да се сравняват в CRM-а.
var LEAD_SOURCE = 'Уебинар 6 октомври (' + AB_VARIANT + ')';

// GitHub репо с материалите за social proof (същото като останалите страници).
var GH_BASE = 'https://raw.githubusercontent.com/agatev200-hash/denis-social-proof/main/';

// Брой текстови testimonial снимки (messages/msg-01.jpg … msg-NN.jpg).
var TESTIMONIAL_COUNT = 36;

// Текстови отзиви (дадени директно от участници в последния уебинар).
var TEXT_TESTIMONIALS = [
  {
    name: 'Стефан',
    date: '24 септември 2026 г.',
    rating: 5,
    text: 'Трябва да се действа, веднъж ще те отхвърлят, втори път ще те отхвърлят, трети път ще стане, няма място за страх и притеснение'
  },
  {
    name: 'Stanislav Kurtev',
    date: '24 септември 2026 г.',
    rating: 5,
    text: 'Полезни и ценни съвети. Супер уебинар беше'
  }
];

// Дата и час на уебинара — българско време (EEST, UTC+3 през октомври).
// ISO с явна отметка +03:00, за да е коректно за всеки посетител независимо от неговата зона.
var WEBINAR_DATETIME = '2026-10-06T19:00:00+03:00';


/* ─── Vercel Analytics — custom events ───────────────────────── */
// va() е дефинирана в <head>; тук е тънка обвивка, за да не гърми ако липсва.
function vaTrack(name, data) {
  try {
    if (typeof window.va === 'function') window.va('event', { name: name, data: data || {} });
  } catch (e) { /* тихо */ }
}


/* ─── A/B page view tracking (за conversion rate по вариант) ─── */
// Без това събитие имаме само conversions (lead_submitted) по вариант,
// без знаменателя (колко хора изобщо са видели всеки вариант) — а без
// знаменател не може да се смята реален conversion rate A срещу Б.
vaTrack('ab_page_view', { variant: AB_VARIANT });


/* ─── CTA клик tracking ─────────────────────────────────────── */
(function () {
  document.querySelectorAll('[data-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      vaTrack('cta_click', { pos: btn.getAttribute('data-cta'), variant: AB_VARIANT });
    });
  });
})();


/* ─── Обратен брояч до уебинара ──────────────────────────────── */
(function () {
  var blocks = document.querySelectorAll('[data-countdown]');
  if (!blocks.length) return;

  var target = new Date(WEBINAR_DATETIME).getTime();
  var timer = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function set(block, unit, val) {
    var el = block.querySelector('[data-cd="' + unit + '"]');
    if (el) el.textContent = val;
  }

  function render() {
    var diff = target - Date.now();
    var ended = diff <= 0;
    if (ended) diff = 0;

    var totalSec = Math.floor(diff / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var minutes = Math.floor((totalSec % 3600) / 60);
    var seconds = totalSec % 60;

    blocks.forEach(function (block) {
      set(block, 'days', days);
      set(block, 'hours', pad(hours));
      set(block, 'minutes', pad(minutes));
      set(block, 'seconds', pad(seconds));
      if (ended) {
        block.classList.add('countdown--ended');
        var label = block.querySelector('.countdown-label');
        if (label) label.textContent = 'Уебинарът вече започна';
      }
    });

    if (ended && timer) { clearInterval(timer); timer = null; }
  }

  render();
  timer = setInterval(render, 1000);
})();


/* ─── Text testimonial carousel ──────────────────────────────── */
(function () {
  var track = document.getElementById('ttTrack');
  var dotsWrap = document.getElementById('ttDots');
  var viewport = document.querySelector('.tt-viewport');
  if (!track) return;

  function initials(name) {
    return name.trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  }
  function stars(n) {
    return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n);
  }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  var slides = [];
  window.ttIndex = 0;

  function syncHeight() {
    var content = slides[window.ttIndex] && slides[window.ttIndex].firstElementChild;
    var img = content && content.tagName === 'IMG' ? content : null;
    if (!img) {
      // Текстов слайд — височината му е известна веднага, без чакане за load.
      viewport.style.height = content ? content.offsetHeight + 'px' : '';
      return;
    }
    if (img.complete && img.naturalHeight) {
      viewport.style.height = img.offsetHeight + 'px';
    } else {
      // Снимката още не е заредена — не свивай viewport-а до 0
      // (CSS min-height държи мястото; изчистваме inline height-а).
      viewport.style.height = '';
    }
  }

  function addSlide(buildContent) {
    var idx = slides.length;
    var slide = document.createElement('div');
    slide.className = 'tt-slide';
    buildContent(slide, idx);
    track.appendChild(slide);
    slides.push(slide);

    var dot = document.createElement('button');
    dot.className = 'tt-dot' + (idx === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Отзив ' + (idx + 1));
    dot.onclick = function () { ttGoTo(idx); };
    dotsWrap.appendChild(dot);
  }

  // Текстови отзиви — първи в реда (най-нови, от последния уебинар).
  TEXT_TESTIMONIALS.forEach(function (t) {
    addSlide(function (slide) {
      var card = document.createElement('div');
      card.className = 'tt-item tt-item-text';
      card.innerHTML =
        '<div class="tt-text-top">' +
          '<span class="tt-avatar">' + esc(initials(t.name)) + '</span>' +
          '<span class="tt-name">' + esc(t.name) + '</span>' +
        '</div>' +
        '<div class="tt-stars-row">' +
          '<span class="tt-stars">' + stars(t.rating) + '</span>' +
          '<span class="tt-date">' + esc(t.date) + '</span>' +
        '</div>' +
        '<p class="tt-text">' + esc(t.text) + '</p>';
      slide.appendChild(card);
    });
  });

  // Snapshot testimonial-и — GitHub репо.
  for (var i = 1; i <= TESTIMONIAL_COUNT; i++) {
    (function (i) {
      addSlide(function (slide, idx) {
        var n = i < 10 ? '0' + i : '' + i;
        var img = document.createElement('img');
        img.src = GH_BASE + 'messages/msg-' + n + '.jpg';
        img.loading = 'lazy';
        img.alt = 'Отзив от клиент';
        img.onload = function () {
          if (idx === window.ttIndex) requestAnimationFrame(syncHeight);
        };
        slide.appendChild(img);
      });
    })(i);
  }

  window.addEventListener('resize', syncHeight);

  function render() {
    track.style.transform = 'translateX(-' + (window.ttIndex * 100) + '%)';
    syncHeight();
    var dots = dotsWrap.children;
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('active', d === window.ttIndex);
    }
  }

  window.ttMove = function (dir) {
    window.ttIndex = (window.ttIndex + dir + slides.length) % slides.length;
    render();
  };
  function ttGoTo(idx) {
    window.ttIndex = idx;
    render();
  }

  render();

  // Снимките са lazy — при влизане на секцията в екрана презареди височината,
  // след като първата картинка се е декодирала.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var content = slides[window.ttIndex] && slides[window.ttIndex].firstElementChild;
          if (content && content.tagName === 'IMG') {
            if (content.complete) syncHeight();
            else content.addEventListener('load', syncHeight, { once: true });
          } else {
            syncHeight();
          }
          setTimeout(syncHeight, 800);
        }
      });
    }, { rootMargin: '200px' });
    io.observe(document.getElementById('proof'));
  } else {
    setTimeout(syncHeight, 1500);
  }
})();


/* ─── FAQ accordion ──────────────────────────────────────────── */
(function () {
  var list = document.getElementById('faqList');
  if (!list) return;

  list.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var answer = item.querySelector('.faq-a');

    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');

      // Затвори всички останали
      list.querySelectorAll('.faq-item.open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = null;
        btn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();


/* ─── Consent линк — маркира чекбокса и при клик върху него ────
   Линкът "Политика за поверителност" е вътре в <label>, но е
   interactive child елемент, затова браузърът НЕ toggle-ва чекбокса
   при клик директно върху линка (само при клик върху останалия текст
   на label-а). Линкът се отваря в нов таб (target="_blank"), така че
   потребителят не губи мястото си — кликът върху него означава
   "прочетох и приемам", затова маркираме чекбокса ръчно. */
(function () {
  var consentLink = document.querySelector('.consent-text a');
  var consentInput = document.getElementById('field-consent');
  if (!consentLink || !consentInput) return;

  consentLink.addEventListener('click', function () {
    consentInput.checked = true;
  });
})();


/* ─── Registration form ──────────────────────────────────────── */
(function () {
  var form = document.getElementById('register-form');
  if (!form) return;

  var fields = ['name', 'email', 'phone', 'consent'];

  function clearErrors() {
    fields.forEach(function (f) {
      document.getElementById('err-' + f).hidden = true;
      document.getElementById('field-' + f).classList.remove('invalid');
    });
  }

  function showError(f) {
    document.getElementById('err-' + f).hidden = false;
    document.getElementById('field-' + f).classList.add('invalid');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var name = document.getElementById('field-name').value.trim();
    var email = document.getElementById('field-email').value.trim();
    var phone = document.getElementById('field-phone').value.trim();
    var consent = document.getElementById('field-consent').checked;

    var valid = true;
    if (!name) { showError('name'); valid = false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email'); valid = false; }
    if (!phone || phone.replace(/\D/g, '').length < 6) { showError('phone'); valid = false; }
    if (!consent) { showError('consent'); valid = false; }
    if (!valid) return;

    var btn = document.getElementById('submit-btn');
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Изпращане...';

    var payload = JSON.stringify({ name: name, email: email, phone: phone, source: LEAD_SOURCE });

    // sendBeacon вместо fetch — заявката преживява незабавна навигация/
    // затваряне на таба (fetch понякога се прекъсва в Facebook in-app
    // browser-а точно когато потребителят бързо продължи напред).
    // fetch с keepalive е fallback за браузъри без sendBeacon поддръжка.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(CRM_WEBHOOK_URL, new Blob([payload], { type: 'text/plain' }));
    } else {
      fetch(CRM_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function () { /* лийдът не е критично загубен */ });
    }

    if (typeof fbq === 'function') fbq('track', 'Lead');
    vaTrack('lead_submitted', { source: LEAD_SOURCE, variant: AB_VARIANT });

    // Кратко изчакване преди redirect — pixel/analytics заявките са
    // асинхронни (beacon/img), и мигновен location.href понякога ги
    // прекъсва преди да са излетели (особено в Facebook in-app browser).
    setTimeout(function () {
      window.location.href = THANK_YOU_URL;
    }, 300);
  });
})();
