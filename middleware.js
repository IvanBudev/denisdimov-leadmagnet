// A/B тест на webinar landing страницата — автоматичен 50/50 split на един URL.
// /webinar/ остава единственият линк за рекламите; тук решаваме коя версия
// (A = пълна фуния, B = къса фуния) вижда всеки конкретен посетител —
// URL-ът в адресната лента остава /webinar/ (rewrite, не redirect).
//
// Разпределението се пази в cookie (`ab-variant`), за да остане consistent
// при повторно посещение на същия човек — важно е, защото app.js чете
// варианта от пътя на заявката (виж AB_VARIANT в app.js), а потребителят
// не бива да вижда различна версия насред flow-а на регистрация.

import { rewrite } from '@vercel/functions';

export const config = {
  matcher: ['/webinar', '/webinar/'],
};

export default function middleware(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const existing = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('ab-variant='));

  let variant = existing ? existing.split('=')[1] : null;
  if (variant !== 'a' && variant !== 'b') {
    variant = Math.random() < 0.5 ? 'a' : 'b';
  }

  const target = variant === 'b' ? '/webinar/b/index.html' : '/webinar/index.html';
  const response = rewrite(new URL(target, request.url));

  if (!existing) {
    response.headers.append(
      'Set-Cookie',
      `ab-variant=${variant}; Path=/webinar; Max-Age=2592000; SameSite=Lax`
    );
  }

  return response;
}
