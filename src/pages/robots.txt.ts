import type { APIRoute } from 'astro';
import { origin } from '../lib/env';
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /_actions/\nSitemap: ${origin}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } },
  );
