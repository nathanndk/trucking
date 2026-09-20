# Public scroll motion

The public Astro layout loads `src/scripts/scroll-motion.ts`. [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and GSAP are dynamically imported; no React island is added. Markup renders fully visible before enhancement and remains usable when scripts fail. Admin routes do not load this module.

- Desktop scrub: 0.6 seconds. Mobile/tablet scrub: 0.25 seconds.
- Hero: photo zoom 1–1.15 and a separate text translation; an additional 80vh pin when eligible.
- Homepage fleet: staggered cards and image emphasis during a 100vh pin. The grid is preserved.
- Pins require width ≥1024px, height ≥760px, and a scene shorter than the viewport with 16px clearance. Taller content uses flowing reveals.
- Flowing headings/copy, card groups, statistics, CTA and the schematic route follow scroll progress in both directions. Statistics retain their CMS values.
- Mobile/tablet translation is at most 24px and photo zoom at most 1.05.
- Font completion and viewport changes rebuild/revert the GSAP context. Image loads refresh geometry. Direct section links are repositioned after pin spacing is established.
- Reduced motion skips animation and pinning. Changing the preference live also cleans up the existing context. Contact form fields have no animated ancestor.

## Verification

`pnpm build && pnpm test` runs the production server against a separate temporary database. `tests/motion.spec.ts` covers matching transforms and pixel comparison after scrolling back, pin eligibility, repeated resizing, all seven public pages at 375/768/1440px, rapid scrolling, reduced motion, disabled JavaScript, failed animation chunk loading, keyboard skip links, direct anchors, stable form input, and empty/variable/oversized fleet records.

The same suite regenerates:

- `hero-desktop.png`: mid-progress hero.
- `fleet-desktop.png`: late-progress pinned fleet.
- `home-mobile.png`: flowing mobile layout.
- `scroll-down-up.webm`: continuous scroll down to coverage and back up.

The video and screenshots use isolated demo content. Run `pnpm check`, `pnpm format:check`, and `pnpm test:unit` for the remaining checks. Browser automation uses Chromium; Safari/Firefox and physical-device testing are not included in this verification.
