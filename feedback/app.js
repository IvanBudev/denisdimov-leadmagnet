/* ═══════════════════════════════════════════════════════════════
   Отзиви за уебинара — feedback страница
   ═══════════════════════════════════════════════════════════════ */

var CRM_TESTIMONIAL_URL =
  'https://crm-denis-dimov.vercel.app/api/webhooks/testimonial' +
  '?token=cb-secret-denisdimov-hv4e37cislfo05r6tq9j';

function vaTrack(name, data) {
  try {
    if (typeof window.va === 'function') window.va('event', { name: name, data: data || {} });
  } catch (e) { /* тихо */ }
}

/* ─── Звезден selector ──────────────────────────────────────── */
var selectedRating = 0;
(function () {
  var wrap = document.getElementById('starInput');
  var buttons = Array.prototype.slice.call(wrap.querySelectorAll('button'));

  function render(hoverVal) {
    var val = hoverVal || selectedRating;
    buttons.forEach(function (btn) {
      var v = Number(btn.getAttribute('data-val'));
      btn.classList.toggle('active', v <= val);
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectedRating = Number(btn.getAttribute('data-val'));
      render();
    });
    btn.addEventListener('mouseenter', function () {
      render(Number(btn.getAttribute('data-val')));
    });
  });
  wrap.addEventListener('mouseleave', function () { render(); });
})();

/* ─── Помощни за рендериране на отзив ──────────────────────── */
function starsHtml(rating) {
  var full = '★'.repeat(rating);
  var empty = '☆'.repeat(5 - rating);
  return full + empty;
}

function initials(name) {
  var parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
}

function formatDate(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderReviews(testimonials) {
  var list = document.getElementById('reviewList');
  var countEl = document.getElementById('listCount');
  var summaryBox = document.getElementById('summaryBox');
  var summaryScore = document.getElementById('summaryScore');
  var summaryStars = document.getElementById('summaryStars');
  var summaryCount = document.getElementById('summaryCount');

  if (!testimonials.length) {
    list.innerHTML = '<div class="empty-state">Все още няма отзиви — бъди първият, който сподели мнението си.</div>';
    countEl.textContent = '';
    summaryBox.hidden = true;
    return;
  }

  var avg = testimonials.reduce(function (sum, t) { return sum + t.rating; }, 0) / testimonials.length;
  summaryScore.textContent = avg.toFixed(1);
  summaryStars.textContent = starsHtml(Math.round(avg));
  summaryCount.textContent = testimonials.length + (testimonials.length === 1 ? ' отзив' : ' отзива');
  summaryBox.hidden = false;

  countEl.textContent = testimonials.length + (testimonials.length === 1 ? ' отзив' : ' отзива');

  list.innerHTML = testimonials.map(function (t) {
    return (
      '<div class="review">' +
        '<div class="review-top">' +
          '<div class="review-avatar">' + escapeHtml(initials(t.name)) + '</div>' +
          '<div class="review-name">' + escapeHtml(t.name) + '</div>' +
          '<div class="review-date">' + formatDate(t.createdAt) + '</div>' +
        '</div>' +
        '<div class="review-stars">' + starsHtml(t.rating) + '</div>' +
        '<div class="review-text">' + escapeHtml(t.text) + '</div>' +
      '</div>'
    );
  }).join('');
}

function loadReviews() {
  fetch(CRM_TESTIMONIAL_URL)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.ok) renderReviews(data.testimonials || []);
      else document.getElementById('reviewList').innerHTML = '<div class="empty-state">Отзивите не могат да се заредят в момента.</div>';
    })
    .catch(function () {
      document.getElementById('reviewList').innerHTML = '<div class="empty-state">Отзивите не могат да се заредят в момента.</div>';
    });
}

loadReviews();

/* ─── Форма ─────────────────────────────────────────────────── */
(function () {
  var form = document.getElementById('reviewForm');

  function clearErrors() {
    ['rating', 'name', 'text'].forEach(function (f) {
      document.getElementById('err-' + f).hidden = true;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var name = document.getElementById('field-name').value.trim();
    var text = document.getElementById('field-text').value.trim();

    var valid = true;
    if (!selectedRating) { document.getElementById('err-rating').hidden = false; valid = false; }
    if (!name) { document.getElementById('err-name').hidden = false; valid = false; }
    if (!text) { document.getElementById('err-text').hidden = false; valid = false; }
    if (!valid) return;

    var btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Изпращане...';

    fetch(CRM_TESTIMONIAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, rating: selectedRating, text: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          vaTrack('testimonial_submitted', { rating: selectedRating });
          document.getElementById('formWrap').style.display = 'none';
          document.getElementById('thanksWrap').classList.add('show');
          loadReviews();
        } else {
          btn.disabled = false;
          btn.textContent = 'Изпрати отзива';
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Изпрати отзива';
      });
  });
})();
