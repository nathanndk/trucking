import type { APIRoute } from 'astro';
import { origin } from '../lib/env';
import { listContent, visibleSections } from '../lib/repository';
import { defaultLocale, locales, localePath, publicPages } from '../i18n';
/**
 * Every public page in both languages. Each entry names its counterpart in the other language
 * (hreflang), and services and articles carry the date they last changed.
 */
export const GET: APIRoute = () => {
  const visible = visibleSections();
  const entries: { path: string; modified?: Date }[] = [
    ...publicPages
      .filter(
        (path) =>
          (path !== '/projects' || visible.projects) && (path !== '/articles' || visible.articles),
      )
      .map((path) => ({ path })),
    ...(['services', 'articles'] as const).flatMap((collection) =>
      listContent(collection, true).map((record) => ({
        path: `/${collection}/${record.slug}`,
        modified: record.updatedAt,
      })),
    ),
  ];
  const url = (locale: (typeof locales)[number], path: string) =>
    `${origin}${localePath(locale, path)}`;
  const urls = entries.flatMap(({ path, modified }) => {
    const alternates = [
      ...locales.map(
        (locale) =>
          `<xhtml:link rel="alternate" hreflang="${locale}" href="${url(locale, path)}"/>`,
      ),
      `<xhtml:link rel="alternate" hreflang="x-default" href="${url(defaultLocale, path)}"/>`,
    ].join('');
    const lastmod = modified ? `<lastmod>${modified.toISOString()}</lastmod>` : '';
    return locales.map(
      (locale) => `<url><loc>${url(locale, path)}</loc>${lastmod}${alternates}</url>`,
    );
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' } },
  );
};
