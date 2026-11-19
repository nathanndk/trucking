# Motion

The public layout loads `src/scripts/scroll-motion.ts`, which dynamically imports GSAP and ScrollTrigger. Server-rendered content is complete and visible without JavaScript; the script only adds motion.

There is one orchestrated moment: **the hero photo settles once as the page opens** (a slow zoom and drift, at most 1.05 and 8px on phones). Headings, paragraphs and cards are static: they are fully in place when they scroll into view and never fade or slide in. Two small motions answer the visitor or carry meaning rather than decorate:

- On Home, the coordination drawing's beams flow towards the company mark while it is on screen, and the two company figures count up once (`motion/react`, Magic UI). Both stand still when the device asks for reduced motion.
- Header links grow their ribbed container marker on hover, and dropdowns and the mobile menu open with their component animations.

Direct anchors land below the pinned header (`scroll-padding-top`), and contact fields never move.

## Verification

`tests/motion.spec.ts` covers the hero, content being in place the moment it scrolls into view, all public routes at 375/768/1440px during fast two-way scrolling, a failed animation chunk, keyboard and anchor navigation, the no-JavaScript fallback and empty/changing/oversized CMS content. Screenshots and the down/up scroll recording are written to each test's folder under `test-results/` (not to the repository), so a test run leaves the working tree clean.
