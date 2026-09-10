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

// Източник, записан на лийда в CRM-а.
var LEAD_SOURCE = 'Уебинар 23 септември';

// GitHub репо с материалите за social proof (същото като останалите страници).
var GH_BASE = 'https://raw.githubusercontent.com/agatev200-hash/denis-social-proof/main/';

// Брой текстови testimonial снимки (messages/msg-01.jpg … msg-NN.jpg).
var TESTIMONIAL_COUNT = 36;

// Дата и час на уебинара — българско време (EEST, UTC+3 през септември).
// ISO с явна отметка +03:00, за да е коректно за всеки посетител независимо от неговата зона.
var WEBINAR_DATETIME = '2026-09-23T19:00:00+03:00';


/* ─── Vercel Analytics — custom events ───────────────────────── */
// va() е дефинирана в <head>; тук е тънка обвивка, за да не гърми ако липсва.
function vaTrack(name, data) {
  try {
    if (typeof window.va === 'function') window.va('event', { name: name, data: data || {} });
  } catch (e) { /* тихо */ }
}


/* ─── CTA клик tracking ─────────────────────────────────────── */
(function () {
  document.querySelectorAll('[data-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      vaTrack('cta_click', { pos: btn.getAttribute('data-cta') });
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

  var slides = [];
  window.ttIndex = 0;

  function syncHeight() {
    var img = slides[window.ttIndex] && slides[window.ttIndex].querySelector('img');
    if (img && img.complete && img.naturalHeight) {
      viewport.style.height = img.offsetHeight + 'px';
    } else {
      // Снимката още не е заредена — не свивай viewport-а до 0
      // (CSS min-height държи мястото; изчистваме inline height-а).
      viewport.style.height = '';
    }
  }

  for (var i = 1; i <= TESTIMONIAL_COUNT; i++) {
    var n = i < 10 ? '0' + i : '' + i;

    var slide = document.createElement('div');
    slide.className = 'tt-slide';

    var img = document.createElement('img');
    img.src = GH_BASE + 'messages/msg-' + n + '.jpg';
    img.loading = 'lazy';
    img.alt = 'Отзив от клиент';
    (function (idx) {
      img.onload = function () {
        // Ре-синхронизирай, ако тъкмо заредената снимка е активната.
        if (idx === window.ttIndex) requestAnimationFrame(syncHeight);
      };
    })(i - 1);
    slide.appendChild(img);
    track.appendChild(slide);
    slides.push(slide);

    var dot = document.createElement('button');
    dot.className = 'tt-dot' + (i === 1 ? ' active' : '');
    dot.setAttribute('aria-label', 'Отзив ' + i);
    (function (idx) {
      dot.onclick = function () { ttGoTo(idx); };
    })(i - 1);
    dotsWrap.appendChild(dot);
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
          var first = slides[window.ttIndex] && slides[window.ttIndex].querySelector('img');
          if (first) {
            if (first.complete) syncHeight();
            else first.addEventListener('load', syncHeight, { once: true });
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

    function done() {
      if (typeof fbq === 'function') fbq('track', 'Lead');
      vaTrack('lead_submitted', { source: LEAD_SOURCE });
      window.location.href = THANK_YOU_URL;
    }

    fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, phone: phone, source: LEAD_SOURCE })
    })
      .then(done)
      .catch(function () {
        // Лийдът не е критично загубен — все пак пращаме човека към thank-you.
        done();
      });
  });
})();
