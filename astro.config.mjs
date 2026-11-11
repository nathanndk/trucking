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
    // Pre-bundle at startup, before the first browser request. Without this the dev server
    // discovers these on the first visit to a page that uses them and re-optimizes mid-load,
    // which can leave React islands (login form, quote form, header) unhydrated.
    optimizeDeps: {
      include: [
        'gsap',
        'gsap/ScrollTrigger',
        'react',
        'react-dom',
        'react-dom/client',
        'radix-ui',
        'cn',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'lucide-react',
        'sonner',
        'react-dropzone',
        'better-auth/react',
        'recharts',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        'tunnel-rat',
        'zod',
      ],
    },
  },
  devToolbar: { enabled: false },
  security: { checkOrigin: true },
});
