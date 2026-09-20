import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { media } from '../../db/schema';
import { mediaFile, mediaPattern } from '../../lib/media';
export const GET: APIRoute = async ({ params, request }) => {
  const relative = params.path || '';
  if (!mediaPattern.test(relative)) return new Response('Not found', { status: 404 });
  const item = db
    .select()
    .from(media)
    .where(eq(media.path, `/media/${relative}`))
    .get();
  if (!item) return new Response('Not found', { status: 404 });
  const etag = `"${item.id}"`;
  const headers = {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    ETag: etag,
  };
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers });
  try {
    return new Response(new Uint8Array(await readFile(mediaFile(relative))), { headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
