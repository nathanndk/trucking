import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle lazy motion imports at startup, before the first browser request.
    optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger'] },
  },
  devToolbar: { enabled: false },
  security: { checkOrigin: true },
});
