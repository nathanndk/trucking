import { asc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import type { Collection, ContentRecord } from './content-config';
export const tables = {
  services: schema.services,
  fleet: schema.fleet,
  coverage: schema.coverage,
  projects: schema.projects,
  clients: schema.clients,
};
export function listContent(collection: Collection, publicOnly = false): ContentRecord[] {
  const table = tables[collection];
  return db
    .select()
    .from(table)
    .where(publicOnly ? eq(table.published, true) : undefined)
    .orderBy(asc(table.sortOrder), asc(table.id))
    .all();
}
export function getSettings() {
  const settings = db.select().from(schema.siteSettings).where(eq(schema.siteSettings.id, 1)).get();
  if (!settings) throw new Error('Site settings missing. Run pnpm db:migrate and pnpm db:seed.');
  return settings;
}
