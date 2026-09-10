# Уебинар — landing страница

Opt-in страница за безплатния уебинар на Денис (23 септември 2026, 19:00).
Vanilla HTML/CSS/JS, без билд. Патърнът е същият като `../forma/` и `../social-proof.html`.

## Файлове

| Файл | Какво |
|---|---|
| `index.html` | Цялата landing страница. Текстовете живеят тук. |
| `styles.css` | Стилове. Цветова палитра по apply.kylefroonjian.com/webinar-join — **черно + бяло + злато** (`#e0c787` акцент/underline, `#ccab40` CTA). Заглавия: Montserrat. Формата за регистрация е **бяла карта**. |
| `app.js` | Testimonial карусел, FAQ accordion, submit на формата. **Конфигурацията е най-отгоре.** |
| `thank-you.html` | Страница след регистрация — бутон към Viber групата. |
| `logo.png` | **Не съществува още** — Наско разработва логото. Hero-то показва SVG placeholder (пунктирна рамка). Като е готово: сложи го като `webinar/logo.png` и смени `src` в hero-логото в `index.html`. |

## Локален преглед

От **корена на проекта** (не от тази папка):

```
node serve.mjs
```

После отвори `http://localhost:3000/webinar/index.html`
(serve.mjs не прави directory index — трябва `/index.html` изрично).

## Какво се сменя често

### 1. Viber линк (`thank-you.html`)
Най-отдолу в `<script>`:
```js
var VIBER_GROUP_URL = 'https://invite.viber.com/?g2=...';
```
Сега е placeholder — сложи реалния invite линк на групата.

### 2. Конфигурация на формата (`app.js`, най-отгоре)
- `CRM_WEBHOOK_URL` — webhook на CRM-а. `&type=webinar` слага лийда в колона
  „Лийдове от уебинар". Токенът е същият `WEBHOOK_SECRET` като другите страници.
- `THANK_YOU_URL` — къде отива човекът след регистрация.
- `LEAD_SOURCE` — текстът в полето „Източник" на лийда в CRM-а.

### 3. Логото (`index.html`, hero секцията)
Hero-то започва с логото на Академията. Сега е SVG placeholder. Замени целия
`<img src="data:image/svg+xml,...">` в `.hero-logo` с `<img src="logo.png" ...>`.

### 4. Текстове на страницата (`index.html`)
Всичко е inline. Секции:
1. Hero (лого → дата/час бар → заглавие → подзаглавие → CTA)
2. Болка / разпознаване
3. Какво ще научиш — **има `[ПОСТАВИ: ...]` бележка**, финализира се с Денис
4. Кой е Денис
5. Social proof (видеа + карусел от `agatev200-hash/denis-social-proof`)
6. FAQ (accordion)
7. Форма (бяла карта)

### 5. Meta Pixel
Pixel id `2216100808812654` (същият като `../index.html`). Праща `PageView` + `Lead` при успешен submit.

## CRM интеграция

Формата прави **един POST** на финала към:
```
POST https://crm-denis-dimov.vercel.app/api/webhooks/lead?token=...&type=webinar
{ "name": "...", "email": "...", "phone": "...", "source": "Уебинар 23 септември" }
```
Webhook-ът създава `SetterLead` със `stage: 'WEBINAR_LEAD'` → колона „Лийдове от уебинар"
в SETTER pipeline (между „платен ресурс" и „безплатен ресурс").

Ако webhook-ът се провали, човекът пак отива на thank-you (лийдът не е критично загубен,
но не е в CRM-а).
