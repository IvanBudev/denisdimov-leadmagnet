// ─── Конфигурация ─────────────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://crm-denis-dimov.vercel.app/api/webhooks/qualified-lead?token=cb-secret-denisdimov-hv4e37cislfo05r6tq9j'
const CALENDAR_URL = 'https://calendly.com/denisdimov/new-meeting'
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@denisdimovtips'
// Линк към VSL-а (Cloudflare R2, bucket vsl-video): YouTube/Vimeo embed адрес или директен .mp4. Празно = placeholder.
const VIDEO_URL = 'https://pub-a97e396387c54e46817ea7e71de9cee1.r2.dev/vsl-720p.mp4'
const OTHER_MAX_WORDS = 30
const LEAD_SOURCE = 'VSL фуния'

// Проследяване. Празно ID = съответният tracker не се зарежда.
const META_PIXEL_ID = '4201980103438483'
const GA4_ID = 'G-J4P81K6947'
// Добави ?debug към адреса, за да виждаш събитията в конзолата.
const TRACK_DEBUG = new URLSearchParams(location.search).has('debug')
// ?test: пълният поток минава и пикселът получава събитията, но НЕ се праща лийд към CRM.
const TEST_MODE = new URLSearchParams(location.search).has('test')
// На колко секунди се праща точка за retention (само GA4).
const RETENTION_STEP_SEC = 15

// Глави във видеото: t = секунда, title = текст в списъка под видеото.
// Попълват се по реалното съдържание на видеото.
const CHAPTERS = [
  { t: 0, title: 'За кого е това видео' },
  { t: 166, title: 'Защо повече усилие носи по-малко интерес' },
  { t: 209, title: 'Причината е в теб и това е добрата новина' },
  { t: 241, title: 'Историята на Денис' },
  { t: 305, title: 'Какво открива за привличането' },
  { t: 349, title: 'Академията и мъжете, които са минали през нея' },
  { t: 458, title: 'Разпознаваш ли се в тези ситуации' },
  { t: 617, title: 'Защо знанието само не е достатъчно' },
  { t: 694, title: '„Мога да се справя и сам"' },
  { t: 800, title: 'Какво е безплатният разговор' },
  { t: 829, title: 'За кого е Академията и за кого не' },
  { t: 879, title: 'Следващата стъпка' },
]
// ─────────────────────────────────────────────────────────────────────────────

function loadTrackers() {
  if (META_PIXEL_ID) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq('init', META_PIXEL_ID)
    fbq('track', 'PageView')
  }
  if (GA4_ID) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
    document.head.appendChild(s)
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    gtag('js', new Date())
    gtag('config', GA4_ID)
  }
}

// kind: 'custom' (trackCustom в Meta) или 'standard' (track). GA4 получава всичко като snake_case събитие.
function track(name, params = {}, kind = 'custom') {
  if (TRACK_DEBUG) console.log('[track]', kind, name, params)
  if (window.fbq) fbq(kind === 'standard' ? 'track' : 'trackCustom', name, params)
  if (window.gtag) gtag('event', name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(), params)
}

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

// Play rate = VSL_Play / PageView. Retention = колко от гледалите стигат до всяка точка.
// Брои се само реално изгледано време (не превъртане), за да не се изкривяват числата.
function setupVideoTracking(v) {
  const watched = new Set()
  const firedPct = new Set()
  let started = false
  let lastT = null

  v.addEventListener('play', () => {
    if (started) return
    started = true
    track('VSL_Play')
  })

  v.addEventListener('seeking', () => { lastT = null })

  v.addEventListener('timeupdate', () => {
    const t = v.currentTime
    const dur = v.duration
    if (!dur || v.paused && lastT === null) { lastT = t; return }
    // Само непрекъснато гледане: скок над 2 сек = превъртане.
    if (lastT !== null && Math.abs(t - lastT) < 2) {
      const sec = Math.floor(t)
      if (!watched.has(sec)) {
        watched.add(sec)
        if (sec > 0 && sec % RETENTION_STEP_SEC === 0) {
          if (window.gtag) track('VSL_Second', { second: sec })
          else if (TRACK_DEBUG) console.log('[track] VSL_Second', sec)
        }
        const pct = (watched.size / dur) * 100
        for (const p of [25, 50, 75, 95]) {
          if (pct >= p && !firedPct.has(p)) {
            firedPct.add(p)
            track(`VSL_Watched_${p}`, { percent: p })
          }
        }
      }
    }
    lastT = t
  })
}

// Собствена лента за управление: сегменти по глави, точки в началото на всяка глава,
// име на главата при посочване. Родните контроли на браузъра не позволяват такова нещо.
const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3z"/><path d="M15 9l6 6m0-6l-6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
}
const SPEEDS = [1, 1.25, 1.5, 2]

const track_ = (...a) => track(...a)

function buildControls(v, frame) {
  const bar = document.createElement('div')
  bar.className = 'vctl'
  bar.hidden = true
  bar.innerHTML = `
    <div class="vtrack" role="slider" tabindex="0" aria-label="Позиция във видеото" aria-valuemin="0">
      <div class="vsegs"></div>
      <div class="vtip" hidden><span class="vtip-title"></span><span class="vtip-time"></span></div>
    </div>
    <div class="vrow">
      <button type="button" class="vbtn" data-c="play" aria-label="Пусни или спри">${ICONS.play}</button>
      <span class="vtime">0:00 / 0:00</span>
      <span class="vgrow"></span>
      <button type="button" class="vbtn vspeed" data-c="speed" aria-label="Скорост">1×</button>
      <button type="button" class="vbtn" data-c="mute" aria-label="Звук">${ICONS.vol}</button>
      <button type="button" class="vbtn" data-c="fs" aria-label="На цял екран">${ICONS.fs}</button>
    </div>`
  frame.appendChild(bar)

  const track = bar.querySelector('.vtrack')
  const segsBox = bar.querySelector('.vsegs')
  const tip = bar.querySelector('.vtip')
  const timeEl = bar.querySelector('.vtime')
  const playBtn = bar.querySelector('[data-c=play]')
  const muteBtn = bar.querySelector('[data-c=mute]')
  const speedBtn = bar.querySelector('[data-c=speed]')
  let segs = []

  const chapters = () => (CHAPTERS.length ? CHAPTERS : [{ t: 0, title: '' }])

  function buildSegments() {
    const dur = v.duration
    if (!dur || segs.length) return
    segsBox.innerHTML = ''
    const ch = chapters()
    segs = ch.map((c, i) => {
      const end = i + 1 < ch.length ? ch[i + 1].t : dur
      const len = end - c.t
      const el = document.createElement('div')
      el.className = 'vseg'
      el.style.flexGrow = String(len)
      el.innerHTML = '<div class="vseg-bar"><div class="vseg-fill"></div></div>' + (c.title ? `<span class="vdot" data-i="${i}"></span>` : '')
      segsBox.appendChild(el)
      return { el, start: c.t, len, title: c.title, fill: el.querySelector('.vseg-fill') }
    })
    track.setAttribute('aria-valuemax', String(Math.floor(dur)))
    paint()
  }

  function paint() {
    const t = v.currentTime
    segs.forEach((s) => {
      const p = Math.min(1, Math.max(0, (t - s.start) / s.len))
      s.fill.style.transform = `scaleX(${p})`
    })
    timeEl.textContent = `${fmtTime(Math.floor(t))} / ${fmtTime(Math.floor(v.duration || 0))}`
    track.setAttribute('aria-valuenow', String(Math.floor(t)))
    track.setAttribute('aria-valuetext', `${fmtTime(Math.floor(t))} от ${fmtTime(Math.floor(v.duration || 0))}`)
  }

  // x (viewport) → { секунда, сегмент }, според реалната геометрия на сегментите.
  function locate(clientX) {
    if (!segs.length) return null
    let hit = segs[segs.length - 1]
    for (const s of segs) {
      const r = s.el.getBoundingClientRect()
      if (clientX <= r.right + 1.5) { hit = s; break }
    }
    const r = hit.el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return { t: hit.start + frac * hit.len, seg: hit }
  }

  function showTip(clientX) {
    const loc = locate(clientX)
    if (!loc) return
    const tr = track.getBoundingClientRect()
    tip.hidden = false
    tip.querySelector('.vtip-title').textContent = loc.seg.title
    tip.querySelector('.vtip-time').textContent = fmtTime(Math.floor(loc.t))
    const w = tip.offsetWidth
    const x = Math.min(tr.width - w / 2, Math.max(w / 2, clientX - tr.left))
    tip.style.left = `${x}px`
  }

  let dragging = false
  track.addEventListener('pointerdown', (e) => {
    const dot = e.target.closest('.vdot')
    const loc = locate(e.clientX)
    if (!loc) return
    dragging = true
    track.setPointerCapture(e.pointerId)
    const target = dot ? chapters()[Number(dot.dataset.i)].t : loc.t
    v.currentTime = target
    if (dot) track_('VSL_ChapterClick', { chapter: chapters()[Number(dot.dataset.i)].title, second: target })
    if (v.paused) v.play()
    paint()
  })
  track.addEventListener('pointermove', (e) => {
    showTip(e.clientX)
    if (dragging) { const loc = locate(e.clientX); if (loc) { v.currentTime = loc.t; paint() } }
  })
  track.addEventListener('pointerup', () => { dragging = false })
  track.addEventListener('pointerleave', () => { if (!dragging) tip.hidden = true })
  track.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -5, ArrowRight: 5 }[e.key]
    if (step) { v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + step)); e.preventDefault(); paint() }
    if (e.key === 'Home') v.currentTime = 0
    if (e.key === 'End') v.currentTime = Math.max(0, v.duration - 1)
    if (e.key === ' ' || e.key === 'k') { v.paused ? v.play() : v.pause(); e.preventDefault() }
  })

  const toggle = () => { v.paused ? v.play() : v.pause() }
  v.addEventListener('click', toggle)
  bar.addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]')?.dataset.c
    if (c === 'play') toggle()
    if (c === 'mute') v.muted = !v.muted
    if (c === 'speed') { v.playbackRate = SPEEDS[(SPEEDS.indexOf(v.playbackRate) + 1) % SPEEDS.length]; speedBtn.textContent = `${v.playbackRate}×` }
    if (c === 'fs') { document.fullscreenElement ? document.exitFullscreen() : frame.requestFullscreen?.() }
  })

  v.addEventListener('play', () => { playBtn.innerHTML = ICONS.pause; frame.classList.remove('idle') })
  v.addEventListener('pause', () => { playBtn.innerHTML = ICONS.play; frame.classList.remove('idle') })
  v.addEventListener('volumechange', () => { muteBtn.innerHTML = v.muted || v.volume === 0 ? ICONS.mute : ICONS.vol })
  v.addEventListener('timeupdate', paint)
  v.addEventListener('seeked', paint)
  if (v.readyState >= 1) buildSegments()
  else v.addEventListener('loadedmetadata', buildSegments)

  // Лентата се скрива след 2.5 сек. без движение, докато върви видеото.
  let idleTimer
  const wake = () => {
    frame.classList.remove('idle')
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => { if (!v.paused) frame.classList.add('idle') }, 2500)
  }
  frame.addEventListener('pointermove', wake)
  frame.addEventListener('keydown', wake)
  frame.addEventListener('pointerdown', wake)

  return { show() { bar.hidden = false; buildSegments(); wake() } }
}

// disqualifying = индекси на отговорите, които веднага дисквалифицират.
const STEPS = [
  {
    id: 'situation',
    question: 'Каква е ситуацията ти в момента?',
    options: [
      'Има конкретна жена, която искам да върна или спечеля',
      'Постоянно се провалям с различни жени',
      'Във връзка съм, но нещата не вървят в добра посока',
      { label: 'Друго — опиши накратко', freeText: true },
    ],
    disqualifying: [],
  },
  {
    id: 'duration',
    question: 'От колко време имаш този проблем?',
    options: [
      'От години — повтаря се с различни жени и в различни ситуации',
      'От няколко месеца',
      'Отскоро — заради една конкретна ситуация',
      'Всъщност нямам проблем, просто разглеждам',
    ],
    disqualifying: [2, 3],
  },
  {
    id: 'blame',
    question: 'Когато нещо се обърка с жена, къде мислиш, че е проблемът?',
    options: [
      'Аз съм виновен — поемам пълна отговорност, вината е изцяло и единствено в мен',
      'И двете страни имат вина',
      'Жените са объркани, нелоялни или търсят само пари',
      'Просто нямам късмет',
    ],
    disqualifying: [2, 3],
  },
  {
    id: 'responsibility',
    question: 'Готов ли си да приемеш отговорността за сегашната си ситуация с жените — че проблемът е в твоето поведение, а не в тях?',
    options: [
      'Да, готов съм',
      'Мисля, че да',
      'Не, не съм — жените са проблемът',
    ],
    disqualifying: [2],
  },
  {
    id: 'tried-alone',
    question: 'Колко време вече се опитваш да го решиш сам и докъде стигна?',
    options: [
      'Опитвам от години и положението не се е променило — сам не успявам',
      'Опитвам от няколко месеца и напредъкът е малък',
      'Още не съм опитвал сериозно',
    ],
    disqualifying: [2],
  },
  {
    id: 'wants-mentor',
    question: 'Кое е най-близо до теб?',
    options: [
      'Знам, че сам не успявам и искам някой да ме води стъпка по стъпка',
      'Искам насоки, но ще го направя по моя начин',
      'Мога сам, просто търся информация',
    ],
    disqualifying: [1, 2],
  },
  {
    id: 'invest',
    question: 'Ако се окаже, че можем да ти помогнем, склонен ли си да инвестираш време и пари в решаването на този проблем?',
    options: [
      'Склонен съм да инвестирам време и пари, ако е подходящо за мен',
      'Зависи от цената',
      'Не, не съм склонен да инвестирам в решаването на този проблем',
    ],
    disqualifying: [2],
  },
]

// answers[i] = индексът на избрания отговор за STEPS[i] (или undefined)
const answers = new Array(STEPS.length).fill(undefined)
// freeTextAnswers[i] = въведеният текст за опция със свободен текст на STEPS[i]
const freeTextAnswers = {}
const contact = { name: '', phone: '', email: '' }
let currentIndex = 0
let submitting = false

const $ = (sel) => document.querySelector(sel)

function optionLabel(opt) {
  return typeof opt === 'string' ? opt : opt.label
}
function optionIsFreeText(opt) {
  return typeof opt === 'object' && opt.freeText === true
}
function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => { el.hidden = true })
  $(`#screen-${name}`).hidden = false
  if (name === 'calendar') renderCalendar()
  $('#apply').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function renderVideo() {
  const frame = $('#video-frame')
  if (!VIDEO_URL) {
    const ph = document.createElement('div')
    ph.className = 'video-placeholder'
    ph.innerHTML = '<span class="play"></span><p>Тук ще се зареди видеото</p>'
    frame.appendChild(ph)
    return
  }
  if (/\.mp4(\?|$)/i.test(VIDEO_URL)) {
    const v = document.createElement('video')
    v.src = VIDEO_URL
    v.playsInline = true
    v.preload = 'metadata'
    frame.appendChild(v)
    setupVideoTracking(v)
    const controls = buildControls(v, frame)

    // Ясен Play бутон в центъра; контролите се появяват след старта.
    const play = document.createElement('button')
    play.type = 'button'
    play.className = 'play-btn'
    play.setAttribute('aria-label', 'Пусни видеото')
    play.innerHTML = '<span class="play-icon"></span>'
    play.addEventListener('click', () => {
      v.play()
      play.hidden = true
      controls.show()
    })
    frame.appendChild(play)
  } else {
    const f = document.createElement('iframe')
    f.src = VIDEO_URL
    f.title = 'Видео от Денис Димов'
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen'
    f.allowFullscreen = true
    frame.appendChild(f)
  }
}

function nextEnabled(index) {
  const choice = answers[index]
  if (choice === undefined) return false
  const opt = STEPS[index].options[choice]
  if (optionIsFreeText(opt)) {
    const text = freeTextAnswers[index] || ''
    return text.trim().length > 0 && wordCount(text) <= OTHER_MAX_WORDS
  }
  return true
}

function refreshNext() {
  $('#q-next').disabled = !nextEnabled(currentIndex)
}

function renderQuestion(index) {
  currentIndex = index
  const step = STEPS[index]

  const pct = Math.round(((index + 1) / STEPS.length) * 100)
  $('#progress-bar').style.width = `${pct}%`
  $('#progress-label').textContent = `Въпрос ${index + 1} от ${STEPS.length}`

  $('#q-title').textContent = step.question

  const box = $('#q-options')
  box.innerHTML = ''
  step.options.forEach((opt, i) => {
    const btn = document.createElement('button')
    btn.className = 'option'
    btn.type = 'button'
    const selected = answers[index] === i
    btn.setAttribute('aria-pressed', String(selected))
    if (selected) btn.classList.add('selected')
    btn.innerHTML = `<span class="option-dot"></span><span>${optionLabel(opt)}</span>`
    btn.addEventListener('click', () => selectOption(index, i))
    box.appendChild(btn)

    if (optionIsFreeText(opt)) {
      const wrap = document.createElement('div')
      wrap.className = 'free-text-wrap'
      wrap.hidden = !selected
      const ta = document.createElement('textarea')
      ta.className = 'free-text'
      ta.rows = 3
      ta.placeholder = `Опиши накратко (до ${OTHER_MAX_WORDS} думи)`
      ta.value = freeTextAnswers[index] || ''
      const counter = document.createElement('p')
      counter.className = 'free-text-counter'
      const updateCounter = () => {
        const n = wordCount(ta.value)
        counter.textContent = `${n} / ${OTHER_MAX_WORDS} думи`
        counter.classList.toggle('over', n > OTHER_MAX_WORDS)
      }
      ta.addEventListener('input', () => {
        freeTextAnswers[index] = ta.value
        updateCounter()
        refreshNext()
      })
      updateCounter()
      wrap.appendChild(ta)
      wrap.appendChild(counter)
      box.appendChild(wrap)
    }
  })

  $('#q-next').textContent = index === STEPS.length - 1 ? 'Виж резултата →' : 'Напред →'
  refreshNext()

  showScreen('question')
}

function selectOption(stepIndex, optionIndex) {
  answers[stepIndex] = optionIndex
  const buttons = $('#q-options').querySelectorAll('.option')
  buttons.forEach((b, i) => {
    b.classList.toggle('selected', i === optionIndex)
    b.setAttribute('aria-pressed', String(i === optionIndex))
  })
  const wrap = $('#q-options .free-text-wrap')
  if (wrap) {
    const freeIdx = STEPS[stepIndex].options.findIndex(optionIsFreeText)
    wrap.hidden = optionIndex !== freeIdx
    if (optionIndex === freeIdx) wrap.querySelector('.free-text').focus()
  }
  refreshNext()
}

function goNext() {
  const step = STEPS[currentIndex]
  const choice = answers[currentIndex]

  if (step.disqualifying.includes(choice)) {
    submitAndShow('disqualified')
    return
  }

  if (currentIndex < STEPS.length - 1) {
    renderQuestion(currentIndex + 1)
  } else {
    submitAndShow('qualified')
  }
}

function goBack() {
  if (currentIndex === 0) {
    showScreen('contact')
    return
  }
  renderQuestion(currentIndex - 1)
}

function collectAnswers() {
  return STEPS.map((step, i) => {
    const choice = answers[i]
    if (choice === undefined) return null
    const opt = step.options[choice]
    if (optionIsFreeText(opt)) {
      const text = (freeTextAnswers[i] || '').trim()
      return { q: step.question, a: text ? `Друго: ${text}` : '' }
    }
    return { q: step.question, a: opt }
  }).filter((x) => x && x.a)
}

function renderCalendar() {
  const box = $('#calendar-embed')
  if (box.dataset.loaded) return
  // Цветовете на календара следват темата на страницата (data-cal-* на <body>).
  const d = document.body.dataset
  const params = new URLSearchParams({
    hide_gdpr_banner: '1',
    background_color: d.calBg || '111111',
    text_color: d.calText || 'ffffff',
    primary_color: d.calPrimary || 'e02020',
    name: contact.name,
    email: contact.email,
  })
  const iframe = document.createElement('iframe')
  iframe.src = `${CALENDAR_URL}?${params.toString()}`
  iframe.setAttribute('loading', 'lazy')
  iframe.title = 'Запази час за разговор'
  box.appendChild(iframe)
  box.dataset.loaded = '1'
}

// Един POST на финала — и за квалифицираните, и за дисквалифицираните (CRM-ът ги
// разпознава по `outcome`; дисквалифицираните отиват в setter базата за nurture).
// Съответният екран се показва и при мрежова грешка.
async function submitAndShow(outcome) {
  if (submitting) return
  submitting = true

  try {
    if (TEST_MODE) throw new Error('test mode: webhook пропуснат')
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        source: LEAD_SOURCE,
        answers: collectAnswers(),
      }),
    })
  } catch (err) {
    console.error('Webhook POST failed:', err)
  }
  // Сигналите за „pixel conditioning": стандартното `Lead` се праща САМО за
  // квалифицирани, за да може Meta да оптимизира „Maximize number of leads"
  // върху хора, минали филтъра. Контактът в началото е `ContactSubmitted`.
  if (outcome === 'qualified') {
    track('Lead', {}, 'standard')
    track('QualifiedApplicant')
  } else {
    track('DisqualifiedApplicant')
  }
  showScreen(outcome === 'qualified' ? 'calendar' : 'disqualified')
}

function startApplication() {
  track('VSL_ApplyClick')
  $('#apply').hidden = false
  showScreen('contact')
}

function init() {
  loadTrackers()
  $('#youtube-link').href = YOUTUBE_CHANNEL_URL
  renderVideo()

  // Calendly съобщава в страницата, когато човекът реално е запазил час.
  window.addEventListener('message', (e) => {
    if (e.origin === 'https://calendly.com' && e.data?.event === 'calendly.event_scheduled') {
      track('Schedule', {}, 'standard')
    }
  })

  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action
    if (action === 'start') startApplication()
    if (action === 'next') goNext()
    if (action === 'back') goBack()
  })

  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const form = e.target
    const name = form.name.value.trim()
    const phone = form.phone.value.trim()
    const email = form.email.value.trim()
    const err = $('#contact-error')

    if (!name || phone.replace(/\D/g, '').length < 6 || !/^\S+@\S+\.\S+$/.test(email)) {
      err.textContent = 'Моля попълни име, валиден телефон и валиден имейл.'
      err.hidden = false
      return
    }
    err.hidden = true

    contact.name = name
    contact.phone = phone
    contact.email = email
    track('ContactSubmitted')
    renderQuestion(0)
  })
}

init()
