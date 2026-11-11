import { count, max } from 'drizzle-orm';
import { db } from '../db';
import { siteCopy } from '../db/schema';
import { applyText, defaults, type Dictionary, type Locale } from '../i18n';
import { copyKeys } from './copy-fields';

let stamp = '';
let cache: Partial<Record<Locale, Dictionary>> = {};

/** Changes whenever a row in site_copy is added or saved. */
function currentStamp() {
  const row = db
    .select({ rows: count(), latest: max(siteCopy.updatedAt) })
    .from(siteCopy)
    .get();
  return `${row?.rows ?? 0}:${row?.latest?.getTime() ?? 0}`;
}
/** Wording an administrator changed, keyed by dictionary path. Blank values are left out. */
export function savedCopy(): Record<string, { id: string; en: string }> {
  const out: Record<string, { id: string; en: string }> = {};
  for (const row of db.select().from(siteCopy).all())
    if (copyKeys.has(row.key) && (row.id.trim() || row.en.trim()))
      out[row.key] = { id: row.id, en: row.en };
  return out;
}
/**
 * The website's wording in one language: the defaults from src/i18n with the
 * administrator's edits laid over them. Rebuilt only when the edits change.
 */
export function ui(locale: Locale): Dictionary {
  const now = currentStamp();
  if (now !== stamp) {
    cache = {};
    stamp = now;
  }
  return (cache[locale] ??= applyText(
    defaults(locale),
    Object.fromEntries(Object.entries(savedCopy()).map(([key, text]) => [key, text[locale]])),
  ));
}
