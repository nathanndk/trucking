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
/**
 * The wording shipped with the code. Pages read text through the reader in src/lib/copy.ts,
 * which lays an administrator's edits over these defaults.
 */
export function defaults(locale: Locale): Dictionary {
  return dictionaries[locale];
}
type Tree = { [key: string]: string | Tree | Tree[] };
/** Every text in a dictionary as "dotted.path" → value, e.g. "route.stops.0.title". */
export function flattenText(dictionary: Dictionary): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'string') out[path] = node;
    else if (node && typeof node === 'object')
      for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
  };
  walk(dictionary, '');
  return out;
}
/** A copy of the dictionary with the given paths replaced. Unknown paths and blanks are ignored. */
export function applyText(dictionary: Dictionary, overrides: Record<string, string>): Dictionary {
  const copy = structuredClone(dictionary);
  for (const [path, value] of Object.entries(overrides)) {
    if (!value.trim()) continue;
    const keys = path.split('.');
    let node: Tree | Tree[] | string | undefined = copy as unknown as Tree;
    for (const key of keys.slice(0, -1))
      node = typeof node === 'object' ? (node as Tree)[key] : undefined;
    const last = keys.at(-1)!;
    if (node && typeof node === 'object' && typeof (node as Tree)[last] === 'string')
      (node as Tree)[last] = value;
  }
  return copy;
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
  return date.toLocaleDateString(defaults(locale).dateLocale, {
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
