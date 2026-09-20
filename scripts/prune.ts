import { unlink } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, sqlite } from '../src/db';
import { media } from '../src/db/schema';
import { collections } from '../src/lib/content-config';
import { getSettings, listContent } from '../src/lib/repository';
import { mediaFile } from '../src/lib/media';
const settings = getSettings();
const used = new Set([
  settings.logo,
  settings.favicon,
  ...collections.flatMap((c) => listContent(c).map((r) => r.image)),
]);
let count = 0;
for (const item of db.select().from(media).all()) {
  // Grace period protects an image uploaded into a currently open editor.
  if (used.has(item.path) || Date.now() - item.createdAt.getTime() < 24 * 60 * 60 * 1000) continue;
  await unlink(mediaFile(item.path.slice('/media/'.length))).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== 'ENOENT') throw e;
  });
  db.delete(media).where(eq(media.id, item.id)).run();
  count++;
}
console.log(`Removed ${count} unreferenced images older than 24 hours.`);
sqlite.close();
