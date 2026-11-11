import type { APIRoute } from 'astro';
import { origin } from '../lib/env';
// Private paths are deliberately not listed here: robots.txt is public, and naming them
// would advertise where the CMS lives. They are kept out of search results by the
// X-Robots-Tag: noindex header set in src/middleware.ts.
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
