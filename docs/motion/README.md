# Automatic, one-time scroll reveals

The public Astro layout loads `src/scripts/scroll-motion.ts`. GSAP and ScrollTrigger are dynamically imported without adding React islands. Server-rendered content remains visible if JavaScript is disabled or loading fails.

Scroll animation starts automatically. There is no activation button and old session choices are ignored. Per the current requested behavior, the public scroll reveals also run when the browser requests reduced motion; decorative CSS animations still follow the device preference.

- The hero gently zooms once when it enters the viewport.
- Headings, paragraphs, cards, statistics and CTA reveal on entry, then remain fully visible when scrolling up.
- The route draws once and its city markers remain visible afterward.
- Scrolling is normal document scrolling, without pinned scenes or reversible scrub timelines.
- Mobile/tablet translation is at most 24px and image zoom at most 1.05.
- A per-page WeakSet remembers started scenes across viewport/font rebuilds, so resizing does not hide previously revealed content. A new page visit can play the reveals again.
- Direct anchors and fast scrolling finish passed scenes. Contact fields remain stationary.

## Verification and evidence

`tests/motion.spec.ts` covers automatic activation with reduced motion and an old disabled preference, persistent visibility after scrolling upward and resizing, all seven routes at 375/768/1440px, keyboard/direct-anchor navigation, stable contact fields, unavailable scripts, and empty/changing/oversized CMS content.

Current evidence:

- `automatic-desktop.png`: automatic animation with reduced motion enabled and no control button.
- `once-mobile.png`: previously revealed content stays revealed after a resize.
- `scroll-once.webm`: scrolling down and back up without reversing the reveals.

Other images and the older `scroll-down-up.webm` document earlier iterations. Tests use isolated demo data and Chromium. Run `pnpm build`, `pnpm test`, `pnpm check`, and `pnpm format:check` to verify the application.
