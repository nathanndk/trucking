import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';
import { origin } from './lib/env';
import { allowRequest } from './lib/spam';
import { detectLocale } from './lib/geo';
import { isPublicPage, localePath, stripLocale, type Locale } from './i18n';
const languageCookie = 'lang';
// Search engines and link previews must always receive the page they asked for.
const crawlers = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|embedly/i;
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  context.locals.admin = null;
  const clientAddress = () => {
    let address = 'unknown';
    try {
      address = context.clientAddress;
    } catch {
      /* adapters may omit address */
    }
    if (process.env.TRUST_PROXY === 'true') address = request.headers.get('x-real-ip') || address;
    return address;
  };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (request.headers.get('origin') !== origin)
      return new Response('Invalid request origin', { status: 403 });
    if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024)
      return new Response('Request too large', { status: 413 });
  }
  if (url.pathname.startsWith('/api/auth/sign-in')) {
    if (!allowRequest(`login:${clientAddress()}`, 10, 10 * 60 * 1000))
      return new Response(
        JSON.stringify({ message: 'Too many attempts. Try again in ten minutes.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
  }
  // Language of a visitor's first page. Arriving on an Indonesian URL from outside the
  // site, a visitor located abroad is sent to the English version. Links followed inside
  // the site (including the language switch) are always respected and remembered.
  const { locale: pathLocale, path } = stripLocale(url.pathname);
  if (
    request.method === 'GET' &&
    isPublicPage(path) &&
    !crawlers.test(request.headers.get('user-agent') || '')
  ) {
    const saved = context.cookies.get(languageCookie)?.value;
    const remembered: Locale | undefined = saved === 'id' || saved === 'en' ? saved : undefined;
    const internal =
      request.headers.get('sec-fetch-site') === 'same-origin' ||
      (request.headers.get('referer') || '').startsWith(`${origin}/`);
    const preferred = internal
      ? pathLocale
      : (remembered ??
        detectLocale({
          address: clientAddress(),
          acceptLanguage: request.headers.get('accept-language'),
        }));
    if (preferred !== remembered)
      context.cookies.set(languageCookie, preferred, {
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
        sameSite: 'lax',
        httpOnly: true,
        secure: origin.startsWith('https:'),
      });
    if (!internal && pathLocale === 'id' && preferred === 'en') {
      const redirect = context.redirect(`${localePath('en', path)}${url.search}`, 302);
      redirect.headers.set('Cache-Control', 'no-store');
      redirect.headers.set('Vary', 'Cookie, Accept-Language');
      return redirect;
    }
  }
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/_actions/')) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user.role === 'admin') context.locals.admin = session.user;
  }
  if (
    (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) &&
    url.pathname !== '/admin/login' &&
    !context.locals.admin
  )
    return context.redirect('/admin/login', 303);
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (origin.startsWith('https:'))
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/_actions')
  ) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
});
