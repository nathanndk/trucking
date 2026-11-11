# Component and asset credits

## Interface

- **shadcn/ui** — https://ui.shadcn.com/ (MIT, shadcn). All files in `src/components/ui` except `dropzone.tsx` are added unmodified with the shadcn CLI (style `new-york`, Radix primitives via the `radix-ui` package). `components.json` records aliases and style. Radix supplies accessible focus management and keyboard behavior; Sonner supplies notifications; `tw-animate-css` supplies the open/close animations.
- **Kibo UI Kanban and Pill** — https://www.kibo-ui.com/components/kanban and https://www.kibo-ui.com/components/pill (MIT, Kibo UI). Added unmodified with the shadcn CLI into `src/components/kibo-ui`. Kanban uses dnd kit (MIT) for dragging.
- **shadcn/ui Chart** uses Recharts (MIT).
- **Kibo UI Dropzone** — https://www.kibo-ui.com/components/dropzone and https://www.kibo-ui.com/r/dropzone.json (MIT, Kibo UI). Source copied into `src/components/ui/dropzone.tsx` with a label/input ID addition and project import aliases. It provides react-dropzone file selection/rejection behavior, while our UploadField handles authenticated server storage.
- **Lucide** icons — https://lucide.dev/ (ISC).
- **Archivo** (variable, with width axis) — Fontsource package, font under SIL Open Font License. Fonts are bundled locally; no Google Fonts connection is required.

Components are normalized to the project's typography, color variables, borders, spacing and motion. No Next.js-specific dependencies are used. Public pages remain Astro SSR.

## Photography and logo

The logo and photographs were supplied by PT Genesis Trans Indonesia for this website. Originals are kept in `assets-src/genesis`; `pnpm images:optimize` generates the WebP files in `public/images/genesis`, the favicon (cut from the globe mark) and the social sharing image.

- The client is responsible for the usage rights of the supplied photographs. Several show shipping-line branding on containers; trademarks pictured do not imply endorsement.
- `7.jpg` shows "Port of Baltimore, USA" signage. It is kept with the sources but not used on the website, because the company operates at Tanjung Priok.
- `4.jpg` is a portrait photograph padded with white bars; only the photograph itself is used.

## Location data

`src/lib/geo/indonesia.json` lists the IP address ranges allocated to Indonesia. It is derived from the APNIC delegation statistics file (https://ftp.apnic.net/stats/apnic/delegated-apnic-latest) by `scripts/update-geo.mjs`. Allocation country is a registry record, not a measured location, so a small share of visitors may be classified differently from where they are.

## MIT notice for adapted MIT components

Copyright (c) the respective authors of shadcn/ui and Kibo UI.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
