import { id, type Dictionary } from './id';
import { en } from './en';

export const locales = ['id', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'id';
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { id, en };

/** Narrows `Astro.currentLocale` (or any string) to a supported locale. */
export function toLocale(value: string | undefined): Locale {
  return value === 'en' ? 'en' : defaultLocale;
}
export function ui(locale: Locale): Dictionary {
  return dictionaries[locale];
}
/** Splits a pathname into its locale and the locale-independent path (always starting with "/"). */
export function stripLocale(pathname: string): { locale: Locale; path: string } {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (clean === '/en') return { locale: 'en', path: '/' };
  if (clean.startsWith('/en/')) return { locale: 'en', path: clean.slice(3) };
  return { locale: defaultLocale, path: clean || '/' };
}
/** Public URL for a locale-independent path. Indonesian is served without a prefix. */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === '/' ? '/en' : `/en${path}`;
}
/** Replaces `{name}` style placeholders in a dictionary string. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}
export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(ui(locale).dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}
/** Locale-independent paths of the public pages (articles add /articles/<slug>). */
export const publicPages = ['/', '/about', '/services', '/projects', '/articles', '/contact'];
export function isPublicPage(path: string): boolean {
  return publicPages.includes(path) || /^\/articles\/[a-z0-9-]+$/.test(path);
}
