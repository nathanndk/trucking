import type { APIRoute } from 'astro';
import { origin } from '../lib/env';
import { listContent } from '../lib/repository';
import { locales, localePath, publicPages } from '../i18n';
export const GET: APIRoute = () => {
  const paths = [
    ...publicPages,
    ...listContent('articles', true).map((article) => `/articles/${article.slug}`),
  ];
  const urls = paths.flatMap((path) =>
    locales.map((locale) => `<url><loc>${origin}${localePath(locale, path)}</loc></url>`),
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
