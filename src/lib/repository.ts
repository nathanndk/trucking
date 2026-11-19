import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import type { Collection, ContentRecord } from './content-config';
import type { Locale } from '../i18n';
export const tables = {
  services: schema.services,
  projects: schema.projects,
  clients: schema.clients,
  articles: schema.articles,
};
/** Raw records for the CMS: both languages, drafts included unless `publicOnly`. */
export function listContent(collection: Collection, publicOnly = false): ContentRecord[] {
  const table = tables[collection];
  return db
    .select()
    .from(table)
    .where(publicOnly ? eq(table.published, true) : undefined)
    .orderBy(
      asc(table.sortOrder),
      // Articles with the same sort order read newest first.
      collection === 'articles' ? desc(table.createdAt) : asc(table.id),
      asc(table.id),
    )
    .all();
}
export function getSettings() {
  const settings = db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).get();
  if (!settings) throw new Error('Site settings missing. Run pnpm db:migrate and pnpm db:seed.');
  return settings;
}

/** Uses the English value when one was entered, otherwise the Indonesian text. */
const pick = (locale: Locale, base: string, english: string) =>
  locale === 'en' && english.trim() ? english : base;

function localize(record: ContentRecord, locale: Locale): ContentRecord {
  return {
    ...record,
    title: pick(locale, record.title, record.titleEn),
    shortDescription: pick(locale, record.shortDescription, record.shortDescriptionEn),
    description: pick(locale, record.description, record.descriptionEn),
  };
}
/** Published records in the visitor's language. */
/**
 * Which optional pages have something to show. A page with nothing published is hidden with its
 * menu link (and answers 404) instead of showing an empty box.
 */
export function visibleSections() {
  const published = (collection: Collection) => listContent(collection, true).length;
  return {
    projects: published('projects') + published('clients') > 0,
    articles: published('articles') > 0,
  };
}
export function getPublicContent(collection: Collection, locale: Locale): ContentRecord[] {
  return listContent(collection, true).map((record) => localize(record, locale));
}
export function getPublicBySlug(
  collection: Collection,
  slug: string,
  locale: Locale,
): ContentRecord | undefined {
  const table = tables[collection];
  const record: ContentRecord | undefined = db
    .select()
    .from(table)
    .where(and(eq(table.slug, slug), eq(table.published, true)))
    .get();
  return record && localize(record, locale);
}
/** Site settings with the translatable fields resolved for the visitor's language. */
export function getPublicSettings(locale: Locale) {
  const s = getSettings();
  return {
    ...s,
    tagline: pick(locale, s.tagline, s.taglineEn),
    shortDescription: pick(locale, s.shortDescription, s.shortDescriptionEn),
    about: pick(locale, s.about, s.aboutEn),
    vision: pick(locale, s.vision, s.visionEn),
    mission: pick(locale, s.mission, s.missionEn),
    ctaText: pick(locale, s.ctaText, s.ctaTextEn),
    credentials: pick(locale, s.credentials, s.credentialsEn),
    statistics: s.statistics.map((stat) => ({
      value: stat.value,
      label: pick(locale, stat.label, stat.labelEn ?? ''),
    })),
  };
}
export type PublicSettings = ReturnType<typeof getPublicSettings>;
