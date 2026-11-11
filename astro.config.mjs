import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  // Indonesian is served without a prefix (/about); English lives under /en (/en/about).
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle lazy motion imports at startup, before the first browser request.
    optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger'] },
  },
  devToolbar: { enabled: false },
  security: { checkOrigin: true },
});
