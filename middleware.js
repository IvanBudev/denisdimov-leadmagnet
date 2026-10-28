// /webinar/ е единственият линк за рекламите. От 4 ноември 2026 целият трафик
// отива към новата проста страница (вариант C). Старият 50/50 A/B сплит
// (A = пълна фуния, B = къса) е спрян; /webinar/index.html (A) и
// /webinar/b/ (B) остават достъпни директно.
// URL-ът в адресната лента остава /webinar/ (rewrite, не redirect).

import { rewrite } from '@vercel/functions';

export const config = {
  matcher: ['/webinar', '/webinar/'],
};

export default function middleware(request) {
  return rewrite(new URL('/webinar/c/index.html', request.url));
}
