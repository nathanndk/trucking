import type { APIRoute } from 'astro';
import { origin } from '../lib/env';
export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/about', '/services', '/fleet', '/coverage', '/projects', '/contact'].map((p) => `<url><loc>${origin}${p}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
